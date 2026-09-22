import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { borrowedFromLine, borrowedIndexHeading } from "@/lib/borrowedFrom";

const schema = z.object({
  assetId: z.string(),
  albumId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, borrowedFromAlbumId: { not: null } },
    include: { borrowedFromAlbum: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    heading: borrowedIndexHeading(photos.length),
    items: photos.map((photo) => ({
      id: photo.id,
      title: photo.title || "Untitled photograph",
      line: borrowedFromLine(photo.borrowedFromAlbum?.title),
      href: `/archive/${photo.id}`,
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A borrowed photograph needs an album." }, { status: 400 });
  const [asset, album] = await Promise.all([
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.album.findFirst({ where: { id: body.data.albumId, familyId: ctx.family.id } }),
  ]);
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { borrowedFromAlbumId: album.id },
    include: { borrowedFromAlbum: true },
  });
  return NextResponse.json({
    asset: updated,
    line: borrowedFromLine(updated.borrowedFromAlbum?.title),
  });
}
