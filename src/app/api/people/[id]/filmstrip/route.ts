import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filmstripHeading, isPhotoAsset, sortFilmstrip } from "@/lib/filmstrip";
import { formatDate } from "@/lib/dates";
import { hideMinorDetails, hidePhotoFromAudience } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { asset: { include: { tags: { include: { person: true } } } } } } },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person)) {
    return NextResponse.json({ error: "A living child’s photographs are not shared with viewers." }, { status: 403 });
  }
  const photos = sortFilmstrip(
    person.tags
      .map((tag) => tag.asset)
      .filter((asset) => asset && isPhotoAsset(asset) && !hidePhotoFromAudience(ctx.role, asset.tags.map((item) => item.person))),
  );
  return NextResponse.json({
    heading: filmstripHeading(person.displayName, photos.length),
    person: { id: person.id, displayName: person.displayName },
    photos: photos.map((photo) => ({
      id: photo.id,
      title: photo.title,
      capturedAt: photo.capturedAt,
      when: formatDate(photo.capturedAt, "Undated"),
      storagePath: photo.storagePath,
    })),
  });
}
