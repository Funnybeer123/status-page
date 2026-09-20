import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { AssetKind, Role } from "@prisma/client";
import exifr from "exifr";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/media";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const personId = url.searchParams.get("personId");
  const assets = await prisma.asset.findMany({
    where: {
      familyId: ctx.family.id,
      ...(personId ? { tags: { some: { personId } } } : {}),
    },
    include: { tags: { include: { person: true } } },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const filtered = year
    ? assets.filter((asset) => asset.capturedAt && asset.capturedAt.getUTCFullYear() === Number(year))
    : assets;
  return NextResponse.json({ assets: filtered });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  const mime = file.type || "application/octet-stream";
  const forced = String(form.get("kind") || "");
  const kind =
    forced === "letter"
      ? AssetKind.letter
      : forced === "video"
        ? AssetKind.video
        : forced === "photo"
          ? AssetKind.photo
          : mime.startsWith("video/")
            ? AssetKind.video
            : AssetKind.photo;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 80 * 1024 * 1024) {
    return NextResponse.json({ error: "That file is larger than 80 MB." }, { status: 413 });
  }
  const ext = extname(file.name) || (mime.startsWith("video/") ? ".mp4" : mime.includes("svg") ? ".svg" : ".bin");
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const storagePath = await saveUpload(ctx.family.id, filename, bytes);

  let capturedAt: Date | null = null;
  const manual = String(form.get("capturedAt") || "");
  if (manual) capturedAt = new Date(manual);
  if (!capturedAt && mime.startsWith("image/")) {
    try {
      const exif = await exifr.parse(bytes, ["DateTimeOriginal", "CreateDate"]);
      const stamp = exif?.DateTimeOriginal || exif?.CreateDate;
      if (stamp) capturedAt = new Date(stamp);
    } catch {
      capturedAt = null;
    }
  }

  const title = String(form.get("title") || file.name);
  const tagIds = String(form.get("personIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const asset = await prisma.asset.create({
    data: {
      familyId: ctx.family.id,
      kind,
      title,
      mimeType: mime,
      storagePath,
      capturedAt,
      uploadedById: ctx.session.user.id,
      tags: tagIds.length ? { create: tagIds.map((personId) => ({ personId })) } : undefined,
    },
    include: { tags: { include: { person: true } } },
  });
  return NextResponse.json({ asset });
}
