import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { syncVitalEvents } from "@/lib/events";
import { hideResidenceForViewer, redactPerson, shouldHideLivingFacts } from "@/lib/privacy";

const schema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  givenName: z.string().max(80).optional(),
  familyName: z.string().max(80).optional(),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  causeOfDeath: z.string().max(400).optional().nullable(),
  languages: z.string().max(200).optional().nullable(),
  burialPlot: z.string().max(200).optional().nullable(),
});

const personInclude = {
  names: true,
  residences: { include: { place: true, citations: true } },
  events: { include: { place: true, otherPerson: true, citations: true } },
  otherEvents: { include: { place: true, person: true, citations: true } },
  storiesTold: true,
  storyLinks: { include: { story: true } },
  citations: { include: { document: true, asset: true, event: true, name: true } },
  documents: { include: { document: true } },
  tags: { include: { asset: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: personInclude,
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const redacted = redactPerson(person, ctx.role);
  return NextResponse.json({
    person: {
      ...redacted,
      residences: hideResidenceForViewer(ctx.role, person) ? [] : person.residences,
      citations: shouldHideLivingFacts(ctx.role, person) ? [] : person.citations,
      living: !person.deathDate,
      factsHidden: shouldHideLivingFacts(ctx.role, person),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid person." }, { status: 400 });
  const existing = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const person = await prisma.person.update({
    where: { id },
    data: {
      displayName: body.data.displayName ?? existing.displayName,
      givenName: body.data.givenName === undefined ? existing.givenName : body.data.givenName || null,
      familyName: body.data.familyName === undefined ? existing.familyName : body.data.familyName || null,
      birthDate:
        body.data.birthDate === undefined
          ? existing.birthDate
          : body.data.birthDate
            ? new Date(body.data.birthDate)
            : null,
      deathDate:
        body.data.deathDate === undefined
          ? existing.deathDate
          : body.data.deathDate
            ? new Date(body.data.deathDate)
            : null,
      notes: body.data.notes === undefined ? existing.notes : body.data.notes,
      causeOfDeath: body.data.causeOfDeath === undefined ? existing.causeOfDeath : body.data.causeOfDeath || null,
      languages: body.data.languages === undefined ? existing.languages : body.data.languages || null,
      burialPlot: body.data.burialPlot === undefined ? existing.burialPlot : body.data.burialPlot || null,
    },
  });
  await syncVitalEvents({
    familyId: ctx.family.id,
    personId: person.id,
    displayName: person.displayName,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
  });
  return NextResponse.json({ person });
}
