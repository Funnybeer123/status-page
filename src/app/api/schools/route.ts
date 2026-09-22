import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  personId: z.string(),
  school: z.string().min(1).max(160),
  place: z.string().max(160).optional(),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const schools = await prisma.schooling.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { startedOn: "asc" },
  });
  return NextResponse.json({ schools });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A school needs a name and a student." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const school = await prisma.schooling.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      school: body.data.school.trim(),
      place: body.data.place?.trim() || null,
      startedOn: body.data.startedOn ? new Date(body.data.startedOn) : null,
      endedOn: body.data.endedOn ? new Date(body.data.endedOn) : null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "school",
    entityId: school.id,
    title: school.school,
    summary: person.displayName,
  });
  return NextResponse.json({ school });
}
