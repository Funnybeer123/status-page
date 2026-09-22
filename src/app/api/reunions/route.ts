import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  place: z.string().min(1).max(160),
  happenedOn: z.string().min(1),
  notes: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

const rsvpSchema = z.object({
  id: z.string(),
  personId: z.string(),
  coming: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
    orderBy: { happenedOn: "asc" },
  });
  return NextResponse.json({ reunions });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A reunion needs a date and a place." }, { status: 400 });
  const personIds = [...new Set(body.data.personIds ?? [])];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds }, deletedAt: null },
  });
  const reunion = await prisma.reunionGathering.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      place: body.data.place.trim(),
      happenedOn: new Date(body.data.happenedOn),
      notes: body.data.notes?.trim() || null,
      guests: people.length ? { create: people.map((person) => ({ personId: person.id, coming: true })) } : undefined,
    },
    include: { guests: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "planned",
    entityType: "reunion",
    entityId: reunion.id,
    title: reunion.title,
    summary: reunion.place,
  });
  return NextResponse.json({ reunion });
}

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = rsvpSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who is coming." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: body.data.id, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const guest = await prisma.reunionGuest.upsert({
    where: { reunionId_personId: { reunionId: reunion.id, personId: person.id } },
    create: { reunionId: reunion.id, personId: person.id, coming: body.data.coming },
    update: { coming: body.data.coming },
    include: { person: true },
  });
  return NextResponse.json({ guest });
}
