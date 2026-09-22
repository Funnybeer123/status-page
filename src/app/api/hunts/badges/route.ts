import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { huntBadgeLine, huntBadgesHeading } from "@/lib/huntBadge";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const finishes = await prisma.huntFinish.findMany({
    where: { familyId: ctx.family.id },
    include: { user: { select: { name: true } }, hunt: true },
    orderBy: { finishedAt: "desc" },
  });
  return NextResponse.json({
    heading: huntBadgesHeading(finishes.length),
    badges: finishes.map((row) => ({
      huntId: row.huntId,
      userId: row.userId,
      name: row.user.name,
      huntTitle: row.hunt.title,
      line: huntBadgeLine(row.user.name || "A relative", row.hunt.title),
      href: `/hunts/${row.huntId}`,
      finishedAt: row.finishedAt,
    })),
  });
}
