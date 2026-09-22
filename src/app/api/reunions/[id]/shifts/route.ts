import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileReunionShifts, shiftLine, shiftsHeading } from "@/lib/reunionShifts";

const schema = z.object({
  personId: z.string(),
  label: z.string().min(1).max(120),
  startsAt: z.string().max(40).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { shifts: { include: { person: true } } },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const shifts = compileReunionShifts(
    reunion.shifts.map((shift) => ({
      id: shift.id,
      personName: shift.person.displayName,
      label: shift.label,
      startsAt: shift.startsAt,
      notes: shift.notes,
    })),
  );
  return NextResponse.json({
    shifts,
    heading: shiftsHeading(reunion.title, shifts.length),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Sign up for a digitizing shift." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const shift = await prisma.reunionShift.create({
    data: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      personId: person.id,
      label: body.data.label.trim(),
      startsAt: body.data.startsAt?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = shiftLine(shift.person.displayName, shift.label, shift.startsAt);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "signed up",
    entityType: "reunion",
    entityId: reunion.id,
    title: `${reunion.title} · ${shift.label}`,
    summary: line,
  });
  return NextResponse.json({ shift, line, heading: shiftsHeading(reunion.title, 1) });
}
