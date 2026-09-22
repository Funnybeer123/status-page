import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  assetId: z.string().optional(),
  documentId: z.string().optional(),
  storyId: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const album = await prisma.album.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      createdBy: { select: { name: true } },
      items: { include: { asset: true, document: true, story: true } },
    },
  });
  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  return NextResponse.json({ album });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const album = await prisma.album.findFirst({ where: { id, familyId: ctx.family.id } });
  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success || (!body.data.assetId && !body.data.documentId && !body.data.storyId)) {
    return NextResponse.json({ error: "Add a photo, letter, or story to the album." }, { status: 400 });
  }
  const item = await prisma.albumItem.create({
    data: {
      albumId: album.id,
      assetId: body.data.assetId,
      documentId: body.data.documentId,
      storyId: body.data.storyId,
    },
    include: { asset: true, document: true, story: true },
  });
  return NextResponse.json({ item });
}
