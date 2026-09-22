import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(2000).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.family.id },
    include: { items: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ albums });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An album needs a title." }, { status: 400 });
  const album = await prisma.album.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() || null,
      createdById: ctx.session.user.id,
    },
    include: { items: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "created",
    entityType: "album",
    entityId: album.id,
    title: album.title,
    summary: "A collection for photos and letters.",
  });
  return NextResponse.json({ album });
}
