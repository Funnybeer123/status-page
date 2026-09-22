import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { blanketLine, blanketsHeading, compileBlankets } from "@/lib/graveBlanket";

const schema = z.object({
  personId: z.string(),
  monthDay: z.string().min(1).max(20),
  placedById: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileBlankets(
    (await prisma.graveBlanket.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, placedBy: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      monthDay: row.monthDay,
      placedBy: row.placedBy?.displayName,
    })),
  );
  return NextResponse.json({ blankets: rows, heading: blanketsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Whose grave, and on which day?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (body.data.placedById) {
    const placedBy = await prisma.person.findFirst({
      where: { id: body.data.placedById, familyId: ctx.family.id, deletedAt: null },
    });
    if (!placedBy) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const row = await prisma.graveBlanket.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      monthDay: body.data.monthDay.trim(),
      placedById: body.data.placedById || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, placedBy: true },
  });
  const line = blanketLine(row.person.displayName, row.monthDay, row.placedBy?.displayName);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "blanket",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ blanket: row, line });
}
