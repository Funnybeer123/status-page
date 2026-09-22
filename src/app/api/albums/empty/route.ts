import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { albumPhotos, emptyAlbumsHeading } from "@/lib/albumZip";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.family.id },
    include: { items: { include: { asset: true } } },
    orderBy: { title: "asc" },
  });
  const empty = albums.filter((album) => !albumPhotos(album.items).length);
  return NextResponse.json({
    heading: emptyAlbumsHeading(empty.length),
    albums: empty.map((album) => ({ id: album.id, title: album.title })),
  });
}
