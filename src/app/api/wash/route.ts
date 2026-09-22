import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileWashDays, washDayLine, washDaysHeading } from "@/lib/washDay";
import { hideMinorDetails } from "@/lib/privacy";

const schema = z.object({
  personId: z.string(),
  weekday: z.string().min(1).max(20),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.washDay.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const visible = rows.filter((row) => !hideMinorDetails(ctx.role, row.person));
  const compiled = compileWashDays(
    visible.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      weekday: row.weekday,
    })),
  );
  return NextResponse.json({ days: compiled, heading: washDaysHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Whose wash day, and which weekday?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.washDay.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      weekday: body.data.weekday.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = washDayLine(row.person.displayName, row.weekday);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "wash",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ day: row, line });
}
