import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileWells, wellLine, wellsHeading } from "@/lib/wellRecord";

const schema = z.object({
  personId: z.string(),
  place: z.string().min(1).max(160),
  depth: z.string().min(1).max(40),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileWells(
    (await prisma.wellRecord.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      place: row.place,
      depth: row.depth,
      year: row.year,
    })),
  );
  return NextResponse.json({ wells: rows, heading: wellsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who dug the well, and how deep?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.wellRecord.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      place: body.data.place.trim(),
      depth: body.data.depth.trim(),
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = wellLine(row.person.displayName, row.place, row.depth, row.year);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "well",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ well: row, line });
}
