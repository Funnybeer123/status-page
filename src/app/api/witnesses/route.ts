import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  eventId: z.string(),
  personId: z.string(),
  role: z.enum(["witness", "officiant", "attendant"]),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose an event, a person, and their role." }, { status: 400 });
  const [event, person] = await Promise.all([
    prisma.lifeEvent.findFirst({ where: { id: body.data.eventId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!event || !person) return NextResponse.json({ error: "That event or person is not in this family." }, { status: 404 });
  const witness = await prisma.eventWitness.upsert({
    where: { eventId_personId: { eventId: event.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      eventId: event.id,
      personId: person.id,
      role: body.data.role,
    },
    update: { role: body.data.role },
  });
  return NextResponse.json({ witness });
}
