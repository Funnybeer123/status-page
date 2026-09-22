import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBiblePagesHeading } from "@/lib/biblePage";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const records = await prisma.bibleRecord.findMany({
    where: { familyId: ctx.family.id, assetId: null },
    include: { holder: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ records, heading: missingBiblePagesHeading(records.length) });
}
