import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isOralHistory, undatedOralHeading } from "@/lib/oralPlaylist";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recordings = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
  });
  const undated = recordings.filter((item) => isOralHistory(item) && !item.capturedAt);
  return NextResponse.json({
    heading: undatedOralHeading(undated.length),
    items: undated.map((item) => ({ id: item.id, title: item.title })),
  });
}
