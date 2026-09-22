import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { envelopeLine, envelopesHeading, hasEnvelope } from "@/lib/envelope";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { envelopeAsset: true },
    orderBy: { writtenAt: "asc" },
  });
  const envelopes = letters.filter(hasEnvelope).map((letter) => ({
    id: letter.id,
    title: letter.title,
    line: envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt),
    href: `/letters/${letter.id}/envelope`,
  }));
  return NextResponse.json({ heading: envelopesHeading(envelopes.length), envelopes });
}
