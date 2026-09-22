import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { charivariGuestLine, charivariHeading, charivarisHeading } from "@/lib/charivari";
import { parseDate } from "@/lib/parse";

const eventSchema = z.object({
  title: z.string().min(1).max(160),
  heldOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

const guestSchema = z.object({
  charivariId: z.string(),
  personId: z.string(),
  noise: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.charivari.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  return NextResponse.json({ charivaris: rows, heading: charivarisHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const guest = guestSchema.safeParse(json);
  if (guest.success) {
    const [event, person] = await Promise.all([
      prisma.charivari.findFirst({ where: { id: guest.data.charivariId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: guest.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!event || !person) return NextResponse.json({ error: "Charivari or person not found." }, { status: 404 });
    const row = await prisma.charivariGuest.upsert({
      where: { charivariId_personId: { charivariId: event.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        charivariId: event.id,
        personId: person.id,
        noise: guest.data.noise.trim(),
        notes: guest.data.notes?.trim() || null,
      },
      update: { noise: guest.data.noise.trim(), notes: guest.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      guest: row,
      line: charivariGuestLine(row.person.displayName, row.noise),
      heading: charivariHeading(event.title, 1),
    });
  }
  const body = eventSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the wedding, or who came with what noise." }, { status: 400 });
  const event = await prisma.charivari.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      heldOn: parseDate(body.data.heldOn),
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "charivari",
    entityId: event.id,
    title: event.title,
    summary: event.title,
  });
  return NextResponse.json({ charivari: event, heading: charivarisHeading(1) });
}
