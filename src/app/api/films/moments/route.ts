import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { parseTimecode, sortFilmMoments } from "@/lib/filmMoments";

const schema = z.object({
  assetId: z.string(),
  seconds: z.union([z.number(), z.string()]),
  title: z.string().min(1).max(160),
  notes: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assetId = new URL(req.url).searchParams.get("assetId");
  const moments = await prisma.filmMoment.findMany({
    where: { familyId: ctx.family.id, ...(assetId ? { assetId } : {}) },
    include: { asset: true },
    orderBy: { seconds: "asc" },
  });
  return NextResponse.json({ moments: sortFilmMoments(moments) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A film moment needs a time and a title." }, { status: 400 });
  const seconds = parseTimecode(body.data.seconds);
  if (seconds == null) return NextResponse.json({ error: "That timestamp is not a time." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Film not found." }, { status: 404 });
  const moment = await prisma.filmMoment.create({
    data: {
      familyId: ctx.family.id,
      assetId: asset.id,
      seconds,
      title: body.data.title.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "marked",
    entityType: "moment",
    entityId: asset.id,
    title: moment.title,
  });
  return NextResponse.json({ moment });
}
