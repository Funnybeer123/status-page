import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { anniversaryHeading, anniversaryLine, yearsSinceFirstUpload } from "@/lib/anniversary";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const first = await prisma.asset.findFirst({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, title: true },
  });
  const years = yearsSinceFirstUpload(first?.createdAt);
  return NextResponse.json({
    first,
    years,
    heading: anniversaryHeading(years),
    line: anniversaryLine(years, first?.createdAt),
  });
}
