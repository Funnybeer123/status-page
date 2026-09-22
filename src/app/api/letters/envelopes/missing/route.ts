import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasEnvelope, missingEnvelopeHeading } from "@/lib/envelope";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { title: "asc" },
  });
  const missing = letters.filter((letter) => !hasEnvelope(letter)).map((letter) => ({
    id: letter.id,
    title: letter.title,
  }));
  return NextResponse.json({ heading: missingEnvelopeHeading(missing.length), letters: missing });
}
