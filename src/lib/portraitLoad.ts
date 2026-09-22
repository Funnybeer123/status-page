import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { buildPortraitWall, isDeceased } from "@/lib/portraits";

export async function loadPortraitWall(familyId: string, role: Role, wall: "all" | "living" | "memorial" = "all") {
  const [people, relationships, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId, ...alive } }),
    prisma.relationship.findMany({ where: { familyId } }),
    prisma.personTag.findMany({
      where: { person: { familyId }, asset: { deletedAt: null, kind: "photo" } },
      orderBy: { asset: { createdAt: "asc" } },
    }),
  ]);
  const visible = people.filter((person) => {
    if (hideMinorDetails(role, person)) return false;
    if (wall === "memorial") return isDeceased(person);
    if (wall === "living") return !isDeceased(person);
    return true;
  });
  const assetIds = [
    ...new Set(
      visible
        .map((person) => person.profileAssetId)
        .concat(tags.map((tag) => tag.assetId))
        .filter(Boolean) as string[],
    ),
  ];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, familyId, deletedAt: null },
  });
  const assetPath = new Map(assets.map((asset) => [asset.id, asset.storagePath]));
  return buildPortraitWall(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
    tags,
    assetPath,
  );
}
