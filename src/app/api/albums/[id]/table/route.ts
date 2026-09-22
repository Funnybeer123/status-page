import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { albumTableHeading, albumTableMark, emptyAlbumTableHeading } from "@/lib/albumTable";
import { watermarkPhoto } from "@/lib/watermark";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const album = await prisma.album.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { items: { include: { asset: { include: { tags: { include: { person: true } } } } } } },
  });
  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  const photos = album.items
    .map((item) => item.asset)
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset && !asset.deletedAt && asset.kind === "photo"))
    .filter((asset) => !hidePhotoFromAudience(ctx.role, asset.tags.map((tag) => tag.person)));
  if (!photos.length) {
    return NextResponse.json({ error: emptyAlbumTableHeading() }, { status: 400 });
  }
  const mark = albumTableMark(ctx.family.name);
  const sheets = [];
  for (const photo of photos) {
    try {
      const bytes = await readFile(join(mediaRoot(), photo.storagePath));
      const marked = watermarkPhoto(bytes, photo.mimeType, mark);
      sheets.push({
        id: photo.id,
        title: photo.title || "Untitled",
        watermark: mark,
        dataUrl: `data:${marked.mimeType};base64,${marked.bytes.toString("base64")}`,
      });
    } catch {
      sheets.push({ id: photo.id, title: photo.title || "Untitled", watermark: mark, dataUrl: null });
    }
  }
  return NextResponse.json({
    heading: albumTableHeading(album.title),
    watermark: mark,
    sheets,
  });
}
