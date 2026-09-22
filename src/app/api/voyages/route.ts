import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  ship: z.string().min(1).max(160),
  departedFrom: z.string().min(1).max(160),
  arrivedAt: z.string().min(1).max(160),
  departedOn: z.string().optional(),
  arrivedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const voyages = await prisma.voyage.findMany({
    where: { familyId: ctx.family.id },
    include: { people: { include: { person: true } } },
    orderBy: { departedOn: "asc" },
  });
  return NextResponse.json({ voyages });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A voyage needs a ship and both ports." }, { status: 400 });
  const personIds = [...new Set(body.data.personIds ?? [])];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds }, deletedAt: null },
  });
  const voyage = await prisma.voyage.create({
    data: {
      familyId: ctx.family.id,
      ship: body.data.ship.trim(),
      departedFrom: body.data.departedFrom.trim(),
      arrivedAt: body.data.arrivedAt.trim(),
      departedOn: body.data.departedOn ? new Date(body.data.departedOn) : null,
      arrivedOn: body.data.arrivedOn ? new Date(body.data.arrivedOn) : null,
      notes: body.data.notes?.trim() || null,
      people: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "voyage",
    entityId: voyage.id,
    title: voyage.ship,
    summary: `${voyage.departedFrom} to ${voyage.arrivedAt}`,
  });
  return NextResponse.json({ voyage });
}
