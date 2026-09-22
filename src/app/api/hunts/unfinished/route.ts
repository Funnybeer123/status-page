import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unfinishedHuntsHeading } from "@/lib/huntBadge";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id, finishes: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ hunts, heading: unfinishedHuntsHeading(hunts.length) });
}
