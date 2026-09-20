import { NextResponse } from "next/server";
import { z } from "zod";
import { RelType, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isPartnerRel, recordMarriageEvent } from "@/lib/events";

const schema = z.object({
  fromPersonId: z.string(),
  toPersonId: z.string(),
  type: z.nativeEnum(RelType),
  startedAt: z.string().optional(),
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
