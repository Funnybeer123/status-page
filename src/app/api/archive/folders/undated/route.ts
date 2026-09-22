import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { compileArchiveFolders, undatedFolderHeading } from "@/lib/archiveFolders";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const visible = filterAssetsForAudience(assets, ctx.role);
  const undated = compileArchiveFolders(visible).find((folder) => folder.decade === "undated");
  const items = undated?.items ?? [];
  return NextResponse.json({ heading: undatedFolderHeading(items.length), items });
}
