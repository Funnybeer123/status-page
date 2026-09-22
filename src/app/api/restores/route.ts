import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { restoreHeading, restoreLine, restorePairHeading } from "@/lib/restore";

const schema = z.object({
  title: z.string().min(1).max(200),
  originalId: z.string(),
  cleanedId: z.string(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const restores = await prisma.photoRestore.findMany({
    where: { familyId: ctx.family.id },
    include: { original: true, cleaned: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    restores,
    heading: restorePairHeading(restores.length),
    lines: restores.map((row) => restoreLine(row.title)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the original scan and the cleaned copy." }, { status: 400 });
  if (body.data.originalId === body.data.cleanedId) {
    return NextResponse.json({ error: "The original scan and the cleaned copy need to be two photographs." }, { status: 400 });
  }
  const [original, cleaned] = await Promise.all([
    prisma.asset.findFirst({ where: { id: body.data.originalId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.asset.findFirst({ where: { id: body.data.cleanedId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!original || !cleaned) return NextResponse.json({ error: "Those photographs are not in this family." }, { status: 404 });
  const restore = await prisma.photoRestore.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      originalId: original.id,
      cleanedId: cleaned.id,
      notes: body.data.notes?.trim() || null,
    },
    include: { original: true, cleaned: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "restored",
    entityType: "restore",
    entityId: restore.id,
    title: restore.title,
  });
  return NextResponse.json({ restore, heading: restoreHeading(restore.title) });
}
