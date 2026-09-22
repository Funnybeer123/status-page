import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePlaceNames, placeNameLine, placeNamesHeading } from "@/lib/placeNames";

const schema = z.object({
  placeId: z.string(),
  name: z.string().min(1).max(160),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.placeName.findMany({
    where: { familyId: ctx.family.id },
    include: { place: true },
    orderBy: { name: "asc" },
  });
  const items = compilePlaceNames(rows);
  return NextResponse.json({ heading: placeNamesHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "How did the family name this place?" }, { status: 400 });
  const place = await prisma.place.findFirst({
    where: { id: body.data.placeId, familyId: ctx.family.id },
  });
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  const row = await prisma.placeName.create({
    data: {
      familyId: ctx.family.id,
      placeId: place.id,
      name: body.data.name.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { place: true },
  });
  return NextResponse.json({
    placeName: row,
    line: placeNameLine(row.name, row.place.name),
  });
}
