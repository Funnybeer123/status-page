import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { buildZip } from "@/lib/zip";
import { albumPhotoName, albumPhotos, albumZipEmptyMessage, albumZipName } from "@/lib/albumZip";
import { hidePhotoFromAudience } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const album = await prisma.album.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { items: { include: { asset: { include: { tags: { include: { person: true } } } } } } },
  });
  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  const photos = albumPhotos(album.items).filter(
    (photo) => photo && !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person)),
  );
  if (!photos.length) return NextResponse.json({ error: albumZipEmptyMessage() }, { status: 400 });
  const files: { name: string; data: Buffer }[] = [];
  for (const [index, photo] of photos.entries()) {
    try {
      const bytes = await readFile(join(mediaRoot(), photo.storagePath || ""));
      files.push({ name: albumPhotoName(photo.title, photo.storagePath, index), data: bytes });
    } catch {
      files.push({
        name: `${albumPhotoName(photo.title, photo.storagePath, index)}.missing.txt`,
        data: Buffer.from("Photograph file was not on this machine.\n", "utf8"),
      });
    }
  }
  const zip = buildZip(files);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${albumZipName(album.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
