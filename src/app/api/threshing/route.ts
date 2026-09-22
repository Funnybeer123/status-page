import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileThreshing, threshingHeading, threshingLine } from "@/lib/threshing";

const schema = z.object({
  personId: z.string(),
  year: z.coerce.number().int().min(1800).max(2100),
  place: z.string().max(160).optional(),
  role: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.threshingRing.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const compiled = compileThreshing(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      year: row.year,
      place: row.place,
      role: row.role,
    })),
  );
  return NextResponse.json({ ring: compiled, heading: threshingHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who worked the ring, and in what year?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.threshingRing.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      year: body.data.year,
      place: body.data.place?.trim() || null,
      role: body.data.role?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = threshingLine(row.person.displayName, row.year, row.role);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "threshing",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ ring: row, line });
}
