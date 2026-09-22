import { NextResponse } from "next/server";
import { z } from "zod";
import { PartnershipEnd, RelType, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isPartnerRel, recordMarriageEvent, recordPartnershipEnd } from "@/lib/events";

const schema = z.object({
  fromPersonId: z.string(),
  toPersonId: z.string(),
  type: z.nativeEnum(RelType),
  startedAt: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  endedAt: z.string(),
  endedKind: z.nativeEnum(PartnershipEnd),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Both people and a relationship type are required." }, { status: 400 });
  if (body.data.fromPersonId === body.data.toPersonId) {
    return NextResponse.json({ error: "A person cannot relate to themselves." }, { status: 400 });
  }
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [body.data.fromPersonId, body.data.toPersonId] } },
  });
  if (people.length !== 2) return NextResponse.json({ error: "Both people must belong to this family." }, { status: 400 });
  const relationship = await prisma.relationship.create({
    data: {
      familyId: ctx.family.id,
      fromPersonId: body.data.fromPersonId,
      toPersonId: body.data.toPersonId,
      type: body.data.type,
      startedAt: body.data.startedAt ? new Date(body.data.startedAt) : null,
    },
  });
  if (isPartnerRel(body.data.type)) {
    const from = people.find((person) => person.id === body.data.fromPersonId)!;
    const to = people.find((person) => person.id === body.data.toPersonId)!;
    await recordMarriageEvent({
      familyId: ctx.family.id,
      fromPersonId: from.id,
      toPersonId: to.id,
      startedAt: relationship.startedAt,
      fromName: from.displayName,
      toName: to.displayName,
    });
  }
  return NextResponse.json({ relationship });
}

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A partnership needs an end date and whether it was a divorce or a separation." }, { status: 400 });
  const existing = await prisma.relationship.findFirst({
    where: { id: body.data.id, familyId: ctx.family.id },
    include: { fromPerson: true, toPerson: true },
  });
  if (!existing || !isPartnerRel(existing.type)) {
    return NextResponse.json({ error: "That partnership was not found." }, { status: 404 });
  }
  const relationship = await prisma.relationship.update({
    where: { id: existing.id },
    data: {
      endedAt: new Date(body.data.endedAt),
      endedKind: body.data.endedKind,
    },
    include: { fromPerson: true, toPerson: true },
  });
  await recordPartnershipEnd({
    familyId: ctx.family.id,
    fromPersonId: relationship.fromPersonId,
    toPersonId: relationship.toPersonId,
    fromName: relationship.fromPerson.displayName,
    toName: relationship.toPerson.displayName,
    endedAt: relationship.endedAt,
    endedKind: body.data.endedKind,
  });
  return NextResponse.json({ relationship });
}
