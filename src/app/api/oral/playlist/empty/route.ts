import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyPlaylistHeading, isOralHistory } from "@/lib/oralPlaylist";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recordings = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
  });
  const empty = !recordings.some(isOralHistory);
  return NextResponse.json({
    heading: empty ? emptyPlaylistHeading() : "The oral-history playlist has recordings",
    empty,
  });
}
