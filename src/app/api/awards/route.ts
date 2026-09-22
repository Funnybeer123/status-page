import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  personId: z.string(),
  title: z.string().min(1).max(160),
  awardedOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const awards = await prisma.awardRecord.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { awardedOn: "asc" },
  });
  return NextResponse.json({ awards });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An award needs a title and a person." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const award = await prisma.awardRecord.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      title: body.data.title.trim(),
      awardedOn: body.data.awardedOn ? new Date(body.data.awardedOn) : null,
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "award",
    entityId: award.id,
    title: award.title,
  });
  return NextResponse.json({ award });
}
