import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isOralHistory } from "@/lib/oralPlaylist";
import { compileOralCredits, oralCreditsHeading } from "@/lib/spokenBy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recordings = (
    await prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      include: { spokenBy: true, uploadedBy: { select: { name: true } } },
    })
  ).filter((asset) => isOralHistory(asset) && asset.spokenById);
  const credits = compileOralCredits(recordings);
  return NextResponse.json({ heading: oralCreditsHeading(credits.length), credits });
}
