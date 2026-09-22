import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { shellingBeeHeading, shellingBeesHeading, shellingGuestLine } from "@/lib/shellingBee";
import { parseDate } from "@/lib/parse";

const beeSchema = z.object({
  ownerId: z.string(),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const guestSchema = z.object({
  beeId: z.string(),
  personId: z.string(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const bees = await prisma.shellingBee.findMany({
    where: { familyId: ctx.family.id },
    include: { owner: true, guests: { include: { person: true } } },
  });
  return NextResponse.json({ bees, heading: shellingBeesHeading(bees.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const guest = guestSchema.safeParse(json);
  if (guest.success) {
    const [bee, person] = await Promise.all([
      prisma.shellingBee.findFirst({ where: { id: guest.data.beeId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: guest.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!bee || !person) return NextResponse.json({ error: "Bee or person not found." }, { status: 404 });
    const row = await prisma.shellingBeeGuest.upsert({
      where: { beeId_personId: { beeId: bee.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        beeId: bee.id,
        personId: person.id,
        notes: guest.data.notes?.trim() || null,
      },
      update: { notes: guest.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      guest: row,
      line: shellingGuestLine(row.person.displayName),
      heading: shellingBeeHeading("This crib", 1),
    });
  }
  const body = beeSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Whose crib, or who came?" }, { status: 400 });
  const owner = await prisma.person.findFirst({
    where: { id: body.data.ownerId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!owner) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const bee = await prisma.shellingBee.create({
    data: {
      familyId: ctx.family.id,
      ownerId: owner.id,
      heldOn: parseDate(body.data.heldOn),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { owner: true },
  });
  const heading = shellingBeeHeading(bee.owner.displayName, 0);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "shelling",
    entityId: bee.id,
    title: heading,
    summary: heading,
  });
  return NextResponse.json({ bee, heading: shellingBeesHeading(1) });
}
