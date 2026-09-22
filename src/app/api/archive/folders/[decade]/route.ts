import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { compileArchiveFolders, decadeFolderHeading } from "@/lib/archiveFolders";

export async function GET(_req: Request, { params }: { params: Promise<{ decade: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { decade } = await params;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const visible = filterAssetsForAudience(assets, ctx.role);
  const folders = compileArchiveFolders(visible);
  const key = decade === "undated" ? "undated" : Number(decade);
  const folder = folders.find((row) => row.decade === key);
  return NextResponse.json({
    heading: folder?.heading || decadeFolderHeading(key === "undated" ? "undated" : Number(decade) || "undated"),
    items: folder?.items ?? [],
  });
}
