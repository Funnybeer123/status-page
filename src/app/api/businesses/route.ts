import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).max(160),
  place: z.string().max(160).optional(),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const businesses = await prisma.familyBusiness.findMany({
    where: { familyId: ctx.family.id },
    include: { people: { include: { person: true } } },
    orderBy: { startedOn: "asc" },
  });
  return NextResponse.json({ businesses });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A business needs a name." }, { status: 400 });
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [...new Set(body.data.personIds ?? [])] }, deletedAt: null },
  });
  const business = await prisma.familyBusiness.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      place: body.data.place?.trim() || null,
      startedOn: body.data.startedOn ? new Date(body.data.startedOn) : null,
      endedOn: body.data.endedOn ? new Date(body.data.endedOn) : null,
      notes: body.data.notes?.trim() || null,
      people: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "business",
    entityId: business.id,
    title: business.name,
  });
  return NextResponse.json({ business });
}
