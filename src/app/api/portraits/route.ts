import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { buildPortraitWall, missingPortraitsHeading } from "@/lib/portraits";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null, kind: "photo" } },
      orderBy: { asset: { createdAt: "asc" } },
    }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const assetIds = [
    ...new Set(
      visible
        .map((person) => person.profileAssetId)
        .concat(tags.map((tag) => tag.assetId))
        .filter(Boolean) as string[],
    ),
  ];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, familyId: ctx.family.id, deletedAt: null },
  });
  const assetPath = new Map(assets.map((asset) => [asset.id, asset.storagePath]));
  const wall = buildPortraitWall(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
    tags,
    assetPath,
  );
  return NextResponse.json({
    ...wall,
    missingHeading: missingPortraitsHeading(wall.missing.length),
  });
}
