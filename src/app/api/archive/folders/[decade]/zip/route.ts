import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { buildZip } from "@/lib/zip";
import { albumPhotoName, albumPhotos } from "@/lib/albumZip";
import { compileArchiveFolders } from "@/lib/archiveFolders";
import { decadeZipEmptyMessage, decadeZipName } from "@/lib/decadeZip";
import { filterAssetsForAudience, hidePhotoFromAudience } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ decade: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { decade } = await params;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const folders = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role));
  const key = decade === "undated" ? "undated" : Number(decade);
  const folder = folders.find((row) => row.decade === key);
  const photos = albumPhotos(
    (folder?.items ?? []).map((item) => ({
      asset: assets.find((asset) => asset.id === item.id),
    })),
  ).filter((photo) => photo && !hidePhotoFromAudience(ctx.role, photo.tags?.map((tag) => tag.person) || []));
  if (!photos.length) return NextResponse.json({ error: decadeZipEmptyMessage() }, { status: 400 });
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
      "Content-Disposition": `attachment; filename="${decadeZipName(key === "undated" ? "undated" : Number(decade) || "undated")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
