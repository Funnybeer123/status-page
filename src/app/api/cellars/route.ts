import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { cellarGuestLine, cellarHeading, cellarsHeading } from "@/lib/cycloneCellar";
import { parseDate } from "@/lib/parse";

const cellarSchema = z.object({
  storm: z.string().min(1).max(160),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const guestSchema = z.object({
  cellarId: z.string(),
  personId: z.string(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.cycloneCellar.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  return NextResponse.json({ cellars: rows, heading: cellarsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const guest = guestSchema.safeParse(json);
  if (guest.success) {
    const [cellar, person] = await Promise.all([
      prisma.cycloneCellar.findFirst({ where: { id: guest.data.cellarId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: guest.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!cellar || !person) return NextResponse.json({ error: "Cellar or person not found." }, { status: 404 });
    const row = await prisma.cycloneCellarGuest.upsert({
      where: { cellarId_personId: { cellarId: cellar.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        cellarId: cellar.id,
        personId: person.id,
        notes: guest.data.notes?.trim() || null,
      },
      update: { notes: guest.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      guest: row,
      line: cellarGuestLine(row.person.displayName),
      heading: cellarHeading(cellar.storm, 1),
    });
  }
  const body = cellarSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the storm, or who sheltered." }, { status: 400 });
  const cellar = await prisma.cycloneCellar.create({
    data: {
      familyId: ctx.family.id,
      storm: body.data.storm.trim(),
      heldOn: parseDate(body.data.heldOn),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "cellar",
    entityId: cellar.id,
    title: cellar.storm,
    summary: cellar.storm,
  });
  return NextResponse.json({ cellar, heading: cellarsHeading(1) });
}
