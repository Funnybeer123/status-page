import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { AssetKind, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/media";
import { recordActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose one or more photographs." }, { status: 400 });
  const tagIds = String(form.get("personIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const capturedAt = String(form.get("capturedAt") || "");
  const assets = [];
  for (const file of files.slice(0, 40)) {
    const mime = file.type || "application/octet-stream";
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = extname(file.name) || (mime.includes("svg") ? ".svg" : ".bin");
    const storagePath = await saveUpload(ctx.family.id, `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`, bytes);
    const asset = await prisma.asset.create({
      data: {
        familyId: ctx.family.id,
        kind: AssetKind.photo,
        title: file.name,
        mimeType: mime,
        storagePath,
        capturedAt: capturedAt ? new Date(capturedAt) : null,
        uploadedById: ctx.session.user.id,
        tags: tagIds.length ? { create: tagIds.map((personId) => ({ personId })) } : undefined,
      },
    });
    assets.push(asset);
  }
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "uploaded",
    entityType: "asset",
    entityId: assets[0]?.id,
    title: `${assets.length} photographs`,
    summary: "bulk",
  });
  return NextResponse.json({ assets, count: assets.length });
}
