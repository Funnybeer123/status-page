import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(2000).optional(),
  personId: z.string().optional(),
  acquiredAt: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const heirlooms = await prisma.heirloom.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, holds: { include: { person: true }, orderBy: { heldFrom: "asc" } } },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ heirlooms });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An heirloom needs a name." }, { status: 400 });
  const heirloom = await prisma.heirloom.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() || null,
      personId: body.data.personId || null,
      acquiredAt: body.data.acquiredAt ? new Date(body.data.acquiredAt) : null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "heirloom",
    entityId: heirloom.id,
    title: heirloom.title,
    summary: heirloom.person?.displayName || "heirloom",
  });
  return NextResponse.json({ heirloom });
}
