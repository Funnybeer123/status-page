import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  note: z.string().max(400).optional(),
  storyId: z.string().optional(),
  documentId: z.string().optional(),
  assetId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const pins = await prisma.pinnedMemory.findMany({
    where: { familyId: ctx.family.id },
    include: { story: true, document: true, asset: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ pins });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pin a story, letter, or photograph." }, { status: 400 });
  const pin = await prisma.pinnedMemory.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      note: body.data.note?.trim() || null,
      storyId: body.data.storyId || null,
      documentId: body.data.documentId || null,
      assetId: body.data.assetId || null,
    },
    include: { story: true, document: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "pinned",
    entityType: "pin",
    entityId: pin.id,
    title: pin.title,
  });
  return NextResponse.json({ pin });
}
