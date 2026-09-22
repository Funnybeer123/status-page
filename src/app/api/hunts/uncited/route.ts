import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { uncitedCluesHeading } from "@/lib/hunt";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const clues = await prisma.huntClue.findMany({
    where: {
      familyId: ctx.family.id,
      documentId: null,
      assetId: null,
      placeId: null,
    },
    include: { hunt: true },
  });
  return NextResponse.json({ clues, heading: uncitedCluesHeading(clues.length) });
}
