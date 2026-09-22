import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { familyFilmstripHeading, isPhotoAsset, sortFilmstrip } from "@/lib/filmstrip";
import { formatDate } from "@/lib/dates";
import { hidePhotoFromAudience } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const photos = sortFilmstrip(
    assets.filter((asset) => isPhotoAsset(asset) && !hidePhotoFromAudience(ctx.role, asset.tags.map((tag) => tag.person))),
  );
  return NextResponse.json({
    heading: familyFilmstripHeading(photos.length),
    photos: photos.map((photo) => ({
      id: photo.id,
      title: photo.title,
      when: formatDate(photo.capturedAt, "Undated"),
      storagePath: photo.storagePath,
    })),
  });
}
