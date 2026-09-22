import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSundayPins, sundayPinLine, sundayPinsHeading } from "@/lib/sundaySchoolPin";

const schema = z.object({
  personId: z.string(),
  year: z.coerce.number().int().min(1800).max(2100),
  church: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSundayPins(
    (await prisma.sundaySchoolPin.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      year: row.year,
      church: row.church,
    })),
  );
  return NextResponse.json({ pins: rows, heading: sundayPinsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who earned the Sunday-school pin, and in what year?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.sundaySchoolPin.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      year: body.data.year,
      church: body.data.church?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = sundayPinLine(row.person.displayName, row.year, row.church);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "pin",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ pin: row, line });
}
