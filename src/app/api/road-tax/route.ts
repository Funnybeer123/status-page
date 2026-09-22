import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileRoadTaxes, roadTaxLine, roadTaxesHeading } from "@/lib/roadTax";

const schema = z.object({
  personId: z.string(),
  road: z.string().min(1).max(160),
  days: z.coerce.number().int().min(1).max(366),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileRoadTaxes(
    (await prisma.roadTax.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      road: row.road,
      days: row.days,
      year: row.year,
    })),
  );
  return NextResponse.json({ taxes: rows, heading: roadTaxesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who worked, which road, and how many days?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.roadTax.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      road: body.data.road.trim(),
      days: body.data.days,
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = roadTaxLine(row.person.displayName, row.road, row.days, row.year);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "road",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ tax: row, line });
}
