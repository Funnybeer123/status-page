import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  kind: z.string().min(1).max(40),
  holderId: z.string().optional(),
  notes: z.string().max(800).optional(),
  doneAt: z.string().optional(),
  id: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [items, unscannedLetters, bibles] = await Promise.all([
    prisma.digitizeItem.findMany({
      where: { familyId: ctx.family.id, doneAt: null },
      include: { holder: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, assetId: null, kind: { in: ["letter", "note"] } },
      select: { id: true, title: true, kind: true },
    }),
    prisma.bibleRecord.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, title: true, holder: { select: { displayName: true } } },
    }),
  ]);
  return NextResponse.json({ items, unscannedLetters, bibles });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Name the letter, photo, or Bible." }, { status: 400 });
  if (body.data.id && body.data.doneAt) {
    const existing = await prisma.digitizeItem.findFirst({ where: { id: body.data.id, familyId: ctx.family.id } });
    if (!existing) return NextResponse.json({ error: "Item not found." }, { status: 404 });
    const item = await prisma.digitizeItem.update({
      where: { id: existing.id },
      data: { doneAt: new Date(body.data.doneAt) },
    });
    return NextResponse.json({ item });
  }
  if (body.data.holderId) {
    const holder = await prisma.person.findFirst({ where: { id: body.data.holderId, familyId: ctx.family.id, deletedAt: null } });
    if (!holder) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const item = await prisma.digitizeItem.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      kind: body.data.kind.trim(),
      holderId: body.data.holderId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { holder: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "queued",
    entityType: "digitize",
    entityId: item.id,
    title: item.title,
  });
  return NextResponse.json({ item });
}
