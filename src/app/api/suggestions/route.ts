import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isoDay, recordPersonChanges } from "@/lib/personChanges";
import { syncVitalEvents } from "@/lib/events";
import {
  applySuggestionValue,
  isSuggestionField,
  suggestionHeading,
  suggestionHistoryHeading,
  suggestionLine,
} from "@/lib/suggestions";

const schema = z.object({
  id: z.string().optional(),
  status: z.enum(["accepted", "dismissed"]).optional(),
  personId: z.string().optional(),
  entityType: z.string().max(40).optional(),
  entityId: z.string().optional(),
  field: z.string().max(80).optional(),
  currentValue: z.string().max(400).optional(),
  proposedValue: z.string().max(400).optional(),
  note: z.string().max(800).optional(),
});

async function notifyOwners(input: { familyId: string; actorId: string; title: string; body: string }) {
  const owners = await prisma.membership.findMany({
    where: { familyId: input.familyId, role: Role.owner, userId: { not: input.actorId } },
  });
  if (!owners.length) return;
  await prisma.notification.createMany({
    data: owners.map((owner) => ({
      familyId: input.familyId,
      userId: owner.userId,
      actorId: input.actorId,
      title: input.title,
      body: input.body,
      href: "/suggestions",
    })),
  });
}

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const mine = ctx.role !== Role.owner;
  const suggestions = await prisma.factSuggestion.findMany({
    where: {
      familyId: ctx.family.id,
      ...(status === "history"
        ? { status: { in: ["accepted", "dismissed"] } }
        : status === "all"
          ? {}
          : { status }),
      ...(mine ? { createdById: ctx.session.user.id } : {}),
    },
    include: { person: true, createdBy: { select: { name: true } }, reviewedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const pending = suggestions.filter((row) => row.status === "pending").length;
  const reviewed = suggestions.filter((row) => row.status !== "pending").length;
  return NextResponse.json({
    suggestions,
    heading: status === "history" ? suggestionHistoryHeading(reviewed) : suggestionHeading(pending),
    lines: suggestions.map((row) => suggestionLine({ name: row.person?.displayName, field: row.field, proposedValue: row.proposedValue })),
  });
}

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A correction needs a field and a proposed value." }, { status: 400 });
  if (body.data.id && body.data.status) {
    const ctx = await apiFamily(Role.owner);
    if ("error" in ctx) return ctx.error;
    const existing = await prisma.factSuggestion.findFirst({
      where: { id: body.data.id, familyId: ctx.family.id },
      include: { person: true },
    });
    if (!existing) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "That correction was already reviewed." }, { status: 400 });
    }
    if (body.data.status === "accepted" && existing.personId && isSuggestionField(existing.field)) {
      const person = await prisma.person.findFirst({
        where: { id: existing.personId, familyId: ctx.family.id, deletedAt: null },
      });
      if (person) {
        const next = applySuggestionValue(existing.field, existing.proposedValue);
        const before =
          existing.field === "birthDate" || existing.field === "deathDate"
            ? isoDay((person as Record<string, unknown>)[existing.field] as Date | null)
            : String((person as Record<string, unknown>)[existing.field] ?? "") || null;
        const after =
          existing.field === "birthDate" || existing.field === "deathDate" ? isoDay(next as Date | null) : next == null ? null : String(next);
        await recordPersonChanges({
          familyId: ctx.family.id,
          personId: person.id,
          actorId: ctx.session.user.id,
          changes: [{ field: existing.field, before, after }],
        });
        await prisma.person.update({
          where: { id: person.id },
          data: { [existing.field]: next },
        });
        if (existing.field === "birthDate" || existing.field === "deathDate") {
          const updated = await prisma.person.findFirstOrThrow({ where: { id: person.id } });
          await syncVitalEvents({
            familyId: ctx.family.id,
            personId: updated.id,
            displayName: updated.displayName,
            birthDate: updated.birthDate,
            deathDate: updated.deathDate,
          });
        }
      }
    }
    const suggestion = await prisma.factSuggestion.update({
      where: { id: existing.id },
      data: { status: body.data.status, reviewedById: ctx.session.user.id, reviewedAt: new Date() },
      include: { person: true },
    });
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: body.data.status,
      entityType: "suggestion",
      entityId: suggestion.id,
      title: suggestionLine({
        name: suggestion.person?.displayName,
        field: suggestion.field,
        proposedValue: suggestion.proposedValue,
      }),
    });
    return NextResponse.json({ suggestion });
  }

  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  if (!body.data.field || !body.data.proposedValue?.trim()) {
    return NextResponse.json({ error: "A correction needs a field and a proposed value." }, { status: 400 });
  }
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const suggestion = await prisma.factSuggestion.create({
    data: {
      familyId: ctx.family.id,
      createdById: ctx.session.user.id,
      personId: body.data.personId || null,
      entityType: body.data.entityType?.trim() || "person",
      entityId: body.data.entityId || body.data.personId || null,
      field: body.data.field.trim(),
      currentValue: body.data.currentValue?.trim() || null,
      proposedValue: body.data.proposedValue.trim(),
      note: body.data.note?.trim() || null,
    },
    include: { person: true },
  });
  await notifyOwners({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    title: "A relative proposed a correction",
    body: suggestionLine({
      name: suggestion.person?.displayName,
      field: suggestion.field,
      proposedValue: suggestion.proposedValue,
    }),
  });
  return NextResponse.json({ suggestion });
}
