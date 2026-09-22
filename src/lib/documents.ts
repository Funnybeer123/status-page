import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { AssetKind, DocKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/media";
import { replaceChunks } from "@/lib/chunk";
import { ocrFile } from "@/lib/ocr";
import { ocrPdf } from "@/lib/pdfOcr";
import { recordActivity } from "@/lib/activity";

const DOC_KINDS = new Set<string>(Object.values(DocKind));

export function parseDocKind(value: string, fallback: DocKind = DocKind.letter) {
  return DOC_KINDS.has(value) ? (value as DocKind) : fallback;
}

export async function saveFamilyDocument(input: {
  familyId: string;
  actorId: string;
  title: string;
  kind: DocKind;
  transcript?: string;
  writtenAt?: string;
  personIds: string[];
  file?: File | null;
  replyToId?: string | null;
  translation?: string | null;
  needsReview?: boolean;
}) {
  let assetId: string | undefined;
  let transcript = input.transcript || "";
  let pages = 0;
  const suppliedTranscript = Boolean(input.transcript?.trim());
  const file = input.file;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = extname(file.name) || (file.type.includes("pdf") ? ".pdf" : ".bin");
    const storagePath = await saveUpload(
      input.familyId,
      `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`,
      bytes,
    );
    const isPdf = file.type.includes("pdf") || ext.toLowerCase() === ".pdf";
    const asset = await prisma.asset.create({
      data: {
        familyId: input.familyId,
        kind:
          input.kind === DocKind.letter || input.kind === DocKind.clipping || input.kind === DocKind.capsule
            ? AssetKind.letter
            : AssetKind.photo,
        title: input.title,
        mimeType: file.type || "application/octet-stream",
        storagePath,
        capturedAt: input.writtenAt ? new Date(input.writtenAt) : null,
        uploadedById: input.actorId,
        tags: input.personIds.length ? { create: input.personIds.map((personId) => ({ personId })) } : undefined,
      },
    });
    assetId = asset.id;
    if (!transcript) {
      if (isPdf) {
        const ocr = await ocrPdf(storagePath);
        transcript = ocr.text;
        pages = ocr.pages;
      } else {
        transcript = await ocrFile(storagePath);
        pages = 1;
      }
    } else if (isPdf) {
      const ocr = await ocrPdf(storagePath);
      pages = ocr.pages;
      if (!transcript.includes("--- Page ")) transcript = ocr.text;
    }
  }
  const document = await prisma.document.create({
    data: {
      familyId: input.familyId,
      assetId,
      title: input.title,
      kind: input.kind,
      transcript,
      translation: input.translation?.trim() || null,
      replyToId: input.replyToId || null,
      needsReview: input.needsReview ?? (Boolean(file && file.size > 0) && !suppliedTranscript),
      writtenAt: input.writtenAt ? new Date(input.writtenAt) : null,
      people: input.personIds.length ? { create: input.personIds.map((personId) => ({ personId })) } : undefined,
    },
    include: { people: { include: { person: true } }, asset: true },
  });
  await replaceChunks({
    familyId: input.familyId,
    documentId: document.id,
    personId: input.personIds[0],
    transcript: [transcript, input.translation?.trim()].filter(Boolean).join("\n\n"),
  });
  await recordActivity({
    familyId: input.familyId,
    actorId: input.actorId,
    verb: "saved",
    entityType:
      input.kind === DocKind.recipe
        ? "recipe"
        : input.kind === DocKind.clipping
          ? "clipping"
          : input.kind === DocKind.obituary
            ? "obituary"
            : input.kind === DocKind.will
              ? "will"
              : input.kind === DocKind.capsule
                ? "capsule"
                : "document",
    entityId: document.id,
    title: input.title,
    summary: pages > 1 ? `${input.kind} · ${pages} pages` : input.kind,
  });
  return { document, pages };
}
