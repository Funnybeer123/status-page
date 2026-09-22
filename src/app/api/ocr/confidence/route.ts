import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clampOcrConfidence, ocrConfidenceLine } from "@/lib/ocrConfidence";

const schema = z.object({
  documentId: z.string(),
  ocrConfidence: z.union([z.number(), z.string()]),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    items: documents.map((document) => ({
      id: document.id,
      title: document.title,
      score: document.ocrConfidence,
      line: ocrConfidenceLine(document.ocrConfidence),
      href: `/letters/${document.id}`,
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An OCR score needs a letter and a number." }, { status: 400 });
  const score = clampOcrConfidence(body.data.ocrConfidence);
  if (score == null) return NextResponse.json({ error: "OCR confidence is a number from 0 to 100." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const document = await prisma.document.update({
    where: { id: existing.id },
    data: { ocrConfidence: score },
  });
  return NextResponse.json({ document, line: ocrConfidenceLine(document.ocrConfidence) });
}
