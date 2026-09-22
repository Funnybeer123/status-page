import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupByUploader, uploadersHeading } from "@/lib/archiveUploaders";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
  });
  const groups = groupByUploader(assets);
  return NextResponse.json({
    heading: uploadersHeading(groups.length),
    groups,
  });
}
