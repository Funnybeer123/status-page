import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { needsOcrConfidence, ocrConfidenceHeading } from "@/lib/ocrConfidence";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
  });
  const missing = documents.filter(needsOcrConfidence);
  return NextResponse.json({
    heading: ocrConfidenceHeading(missing.length),
    letters: missing.map((document) => ({ id: document.id, title: document.title })),
  });
}
