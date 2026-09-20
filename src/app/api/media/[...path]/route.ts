import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { absoluteMediaPath } from "@/lib/media";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { path } = await params;
  const storagePath = path.join("/");
  if (storagePath.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { familyId: ctx.family.id, storagePath },
  });
  if (!asset) return NextResponse.json({ error: "Not found." }, { status: 404 });
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
