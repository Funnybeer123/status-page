import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { compilePhotoDuplicates, photoCrc, photoDuplicatesHeading } from "@/lib/photoDuplicates";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, OR: [{ kind: "photo" }, { mimeType: { startsWith: "image/" } }] },
  });
  const items = [];
  for (const photo of photos) {
    let crc: string | null = null;
    try {
      const bytes = await readFile(join(mediaRoot(), photo.storagePath));
      crc = photoCrc(bytes);
    } catch {
      crc = null;
    }
    items.push({
      id: photo.id,
      title: photo.title,
      capturedAt: photo.capturedAt,
      mimeType: photo.mimeType,
      crc,
      href: `/archive/${photo.id}`,
    });
  }
  const groups = compilePhotoDuplicates(items);
  return NextResponse.json({ heading: photoDuplicatesHeading(groups.length), groups });
}
