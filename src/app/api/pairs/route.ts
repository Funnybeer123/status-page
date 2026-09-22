import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  thenAssetId: z.string(),
  nowAssetId: z.string(),
  placeId: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const pairs = await prisma.photoPair.findMany({
    where: { familyId: ctx.family.id },
    include: { thenAsset: true, nowAsset: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ pairs });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A then-and-now pair needs two photographs." }, { status: 400 });
  if (body.data.thenAssetId === body.data.nowAssetId) {
    return NextResponse.json({ error: "Choose two different photographs." }, { status: 400 });
  }
  const assets = await prisma.asset.findMany({
    where: {
      familyId: ctx.family.id,
      deletedAt: null,
      id: { in: [body.data.thenAssetId, body.data.nowAssetId] },
    },
  });
  if (assets.length !== 2) return NextResponse.json({ error: "Both photographs must belong to this family." }, { status: 400 });
  const place = body.data.placeId
    ? await prisma.place.findFirst({ where: { id: body.data.placeId, familyId: ctx.family.id } })
    : null;
  const pair = await prisma.photoPair.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      thenAssetId: body.data.thenAssetId,
      nowAssetId: body.data.nowAssetId,
      placeId: place?.id ?? null,
      notes: body.data.notes?.trim() || null,
    },
    include: { thenAsset: true, nowAsset: true, place: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "paired",
    entityType: "pair",
    entityId: pair.id,
    title: pair.title,
  });
  return NextResponse.json({ pair });
}
