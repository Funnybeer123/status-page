import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSorghum, sorghumHeading, sorghumLine } from "@/lib/sorghumBoil";

const schema = z.object({
  personId: z.string(),
  gallons: z.string().min(1).max(40),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSorghum(
    (await prisma.sorghumBoil.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      gallons: row.gallons,
      year: row.year,
      place: row.place,
    })),
  );
  return NextResponse.json({ boils: rows, heading: sorghumHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who boiled the sorghum, and how many gallons?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.sorghumBoil.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      gallons: body.data.gallons.trim(),
      year: body.data.year || null,
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = sorghumLine(row.person.displayName, row.gallons, row.place, row.year);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "sorghum",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ boil: row, line });
}
