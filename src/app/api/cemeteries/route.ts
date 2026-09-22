import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const cemeterySchema = z.object({
  name: z.string().min(1).max(160),
  locality: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  notes: z.string().max(800).optional(),
});

const plotSchema = z.object({
  cemeteryId: z.string(),
  personId: z.string(),
  plot: z.string().max(160).optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const cemeteries = await prisma.cemetery.findMany({
    where: { familyId: ctx.family.id },
    include: { plots: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ cemeteries });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const raw = await req.json().catch(() => null);
  const plot = plotSchema.safeParse(raw);
  if (plot.success) {
    const cemetery = await prisma.cemetery.findFirst({
      where: { id: plot.data.cemeteryId, familyId: ctx.family.id },
    });
    const person = await prisma.person.findFirst({
      where: { id: plot.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!cemetery || !person) return NextResponse.json({ error: "Cemetery or person not found." }, { status: 404 });
    const created = await prisma.cemeteryPlot.create({
      data: {
        cemeteryId: cemetery.id,
        personId: person.id,
        plot: plot.data.plot?.trim() || null,
        notes: plot.data.notes?.trim() || null,
      },
      include: { person: true, cemetery: true },
    });
    return NextResponse.json({ plot: created });
  }
  const body = cemeterySchema.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: "A cemetery needs a name." }, { status: 400 });
  const cemetery = await prisma.cemetery.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      locality: body.data.locality?.trim() || null,
      region: body.data.region?.trim() || null,
      country: body.data.country?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { plots: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "cemetery",
    entityId: cemetery.id,
    title: cemetery.name,
  });
  return NextResponse.json({ cemetery });
}
