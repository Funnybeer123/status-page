import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { uncreditedHeading } from "@/lib/borrowedFrom";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", borrowedFromAlbumId: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    heading: uncreditedHeading(photos.length),
    items: photos.map((photo) => ({ id: photo.id, title: photo.title || "Untitled photograph" })),
  });
}
