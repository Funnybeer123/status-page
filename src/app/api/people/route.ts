import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { syncVitalEvents } from "@/lib/events";
import { redactPeople } from "@/lib/privacy";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  displayName: z.string().min(1).max(120),
  givenName: z.string().max(80).optional(),
  familyName: z.string().max(80).optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  notes: z.string().max(4000).optional(),
  sex: z.string().max(8).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({ people: redactPeople(people, ctx.role) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A display name is required." }, { status: 400 });
  const person = await prisma.person.create({
    data: {
      familyId: ctx.family.id,
      displayName: body.data.displayName.trim(),
      givenName: body.data.givenName || null,
      familyName: body.data.familyName || null,
      birthDate: body.data.birthDate ? new Date(body.data.birthDate) : null,
      deathDate: body.data.deathDate ? new Date(body.data.deathDate) : null,
      notes: body.data.notes || null,
      sex: body.data.sex || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "person",
    entityId: person.id,
    title: person.displayName,
    summary: "A person was added to the tree.",
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
