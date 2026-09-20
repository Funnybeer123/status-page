import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { saveUpload } from "@/lib/media";
import { ocrFile } from "@/lib/ocr";

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a letter scan." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extname(file.name) || ".png";
  const storagePath = await saveUpload(
    ctx.family.id,
    `ocr-${Date.now()}-${randomBytes(3).toString("hex")}${ext}`,
    bytes,
  );
  const text = await ocrFile(storagePath);
  return NextResponse.json({ text, storagePath });
}
