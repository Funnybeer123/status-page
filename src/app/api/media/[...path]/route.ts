import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { absoluteMediaPath } from "@/lib/media";

async function sharedAsset(storagePath: string) {
  const asset = await prisma.asset.findFirst({
    where: { storagePath, deletedAt: null },
    include: { albumItems: true, tags: true },
  });
  if (!asset) return null;
  const albumIds = asset.albumItems.map((item) => item.albumId);
  if (!albumIds.length && !asset.tags.length) return null;
  const personIds = asset.tags.map((tag) => tag.personId);
  const link = await prisma.shareLink.findFirst({
    where: {
      OR: [
        albumIds.length ? { kind: "album", entityId: { in: albumIds } } : undefined,
        personIds.length ? { kind: "memorial", entityId: { in: personIds } } : undefined,
      ].filter(Boolean) as { kind: "album" | "memorial"; entityId: { in: string[] } }[],
    },
  });
  return link ? asset : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const storagePath = path.join("/");
  if (storagePath.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  const ctx = await apiFamily();
  const asset =
    "error" in ctx
      ? await sharedAsset(storagePath)
      : await prisma.asset.findFirst({
          where: { familyId: ctx.family.id, storagePath },
        });
  if (!asset) {
    if ("error" in ctx) return ctx.error;
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const full = absoluteMediaPath(asset.storagePath);
  try {
    await stat(full);
  } catch {
    return NextResponse.json({ error: "File missing." }, { status: 404 });
  }
  const stream = createReadStream(full);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
