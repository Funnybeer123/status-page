import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { AssetKind, DocKind, Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/media";
import { replaceChunks } from "@/lib/chunk";
import { ocrFile } from "@/lib/ocr";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id },
    include: { people: { include: { person: true } }, asset: true },
    orderBy: { writtenAt: "desc" },
  });
  return NextResponse.json({ letters });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const transcript = String(form.get("transcript") || "");
  const writtenAt = String(form.get("writtenAt") || "");
  const kind = String(form.get("kind") || "letter") === "note" ? DocKind.note : DocKind.letter;
  const personIds = String(form.get("personIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });

  let assetId: string | undefined;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = extname(file.name) || ".bin";
    const storagePath = await saveUpload(
      ctx.family.id,
      `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`,
      bytes,
    );
    const asset = await prisma.asset.create({
      data: {
        familyId: ctx.family.id,
        kind: kind === DocKind.letter ? AssetKind.letter : AssetKind.photo,
        title,
        mimeType: file.type || "application/octet-stream",
        storagePath,
        capturedAt: writtenAt ? new Date(writtenAt) : null,
        uploadedById: ctx.session.user.id,
        tags: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
      },
    });
    assetId = asset.id;
    if (!transcript) {
      const ocr = await ocrFile(storagePath);
      form.set("transcript", ocr);
    }
  }

  const text = String(form.get("transcript") || transcript);
  const document = await prisma.document.create({
    data: {
      familyId: ctx.family.id,
      assetId,
      title,
      kind,
      transcript: text,
      writtenAt: writtenAt ? new Date(writtenAt) : null,
      people: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
    },
  });
  await replaceChunks({
    familyId: ctx.family.id,
    documentId: document.id,
    personId: personIds[0],
    transcript: text,
  });
  return NextResponse.json({ document });
}
