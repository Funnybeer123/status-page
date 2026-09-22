import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { archiveFoldersHeading, compileArchiveFolders } from "@/lib/archiveFolders";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  const visible = filterAssetsForAudience(assets, ctx.role);
  const folders = compileArchiveFolders(visible);
  return NextResponse.json({ heading: archiveFoldersHeading(folders.length), folders });
}
