import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyScrapbookHeading } from "@/lib/scrapbook";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const count = await prisma.lifeEvent.count({
    where: { familyId: ctx.family.id, firstTag: { not: null } },
  });
  return NextResponse.json({
    heading: count ? `${count} firsts are already in the scrapbook` : emptyScrapbookHeading(),
    empty: count === 0,
  });
}
