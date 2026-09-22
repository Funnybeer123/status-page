import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { confirmationHeading, confirmationsHeading } from "@/lib/confirmationClass";

const classSchema = z.object({
  church: z.string().min(1).max(160),
  year: z.coerce.number().int().min(1800).max(2100),
  notes: z.string().max(400).optional(),
});

const pupilSchema = z.object({
  classId: z.string(),
  personId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const classes = await prisma.confirmationClass.findMany({
    where: { familyId: ctx.family.id },
    include: { pupils: { include: { person: true } } },
  });
  return NextResponse.json({ classes, heading: confirmationsHeading(classes.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const pupil = pupilSchema.safeParse(json);
  if (pupil.success) {
    const [row, person] = await Promise.all([
      prisma.confirmationClass.findFirst({ where: { id: pupil.data.classId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: pupil.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!row || !person) return NextResponse.json({ error: "Class or person not found." }, { status: 404 });
    const link = await prisma.confirmationPupil.upsert({
      where: { classId_personId: { classId: row.id, personId: person.id } },
      create: { classId: row.id, personId: person.id },
      update: {},
      include: { person: true },
    });
    return NextResponse.json({
      pupil: link,
      heading: confirmationHeading(row.church, row.year, 1),
    });
  }
  const body = classSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Which church, and which year?" }, { status: 400 });
  const row = await prisma.confirmationClass.create({
    data: {
      familyId: ctx.family.id,
      church: body.data.church.trim(),
      year: body.data.year,
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "confirmation",
    entityId: row.id,
    title: confirmationHeading(row.church, row.year, 0),
    summary: confirmationHeading(row.church, row.year, 0),
  });
  return NextResponse.json({ class: row, heading: confirmationsHeading(1) });
}
