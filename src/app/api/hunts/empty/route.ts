import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyHuntsHeading } from "@/lib/hunt";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id, clues: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ hunts, heading: emptyHuntsHeading(hunts.length) });
}
