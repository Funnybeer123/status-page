import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).max(160),
  branch: z.string().max(160).optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(800).optional(),
  serviceId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const units = await prisma.militaryUnit.findMany({
    where: { familyId: ctx.family.id },
    include: { services: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ units });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A unit needs a name." }, { status: 400 });
  const unit = await prisma.militaryUnit.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      branch: body.data.branch?.trim() || null,
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  if (body.data.serviceId) {
    const service = await prisma.militaryService.findFirst({
      where: { id: body.data.serviceId, familyId: ctx.family.id },
    });
    if (service) {
      await prisma.militaryService.update({
        where: { id: service.id },
        data: { unitId: unit.id, unit: unit.name },
      });
    }
  }
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "unit",
    entityId: unit.id,
    title: unit.name,
  });
  return NextResponse.json({ unit });
}
