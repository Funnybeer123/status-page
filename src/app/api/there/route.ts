import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { isLiving } from "@/lib/privacy";
import { thereHeading, thereLine } from "@/lib/cityDirectory";

const schema = z.object({
  eventId: z.string(),
  personId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.eventWitness.findMany({
    where: { familyId: ctx.family.id, role: "there" },
    include: { person: true, event: true },
    orderBy: { event: { happenedOn: "desc" } },
  });
  return NextResponse.json({
    attendances: rows,
    heading: thereHeading(rows.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the event you were at." }, { status: 400 });
  const personId = body.data.personId || ctx.membership.personId;
  if (!personId) return NextResponse.json({ error: "Claim yourself before marking that you were there." }, { status: 400 });
  const [event, person] = await Promise.all([
    prisma.lifeEvent.findFirst({ where: { id: body.data.eventId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!event || !person) return NextResponse.json({ error: "That event or person is not in this family." }, { status: 404 });
  if (!isLiving(person)) return NextResponse.json({ error: "Only a living relative can say they were there." }, { status: 400 });
  const attendance = await prisma.eventWitness.upsert({
    where: { eventId_personId: { eventId: event.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      eventId: event.id,
      personId: person.id,
      role: "there",
    },
    update: { role: "there" },
    include: { person: true, event: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "marked",
    entityType: "there",
    entityId: attendance.id,
    title: thereLine(person.displayName, event.title),
  });
  return NextResponse.json({ attendance });
}
