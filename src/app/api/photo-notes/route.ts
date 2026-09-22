import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  assetId: z.string(),
  text: z.string().min(1).max(400),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
});

function asPercent(value?: number | string) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assetId = new URL(req.url).searchParams.get("assetId") || undefined;
  const notes = await prisma.photoNote.findMany({
    where: { familyId: ctx.family.id, ...(assetId ? { assetId } : {}) },
    include: { asset: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A sticky note needs the wording." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  const note = await prisma.photoNote.create({
    data: {
      familyId: ctx.family.id,
      assetId: asset.id,
      text: body.data.text.trim(),
      x: asPercent(body.data.x),
      y: asPercent(body.data.y),
    },
    include: { asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "noted",
    entityType: "photo-note",
    entityId: note.id,
    title: asset.title || "Photograph",
    summary: note.text,
  });
  return NextResponse.json({ note });
}
