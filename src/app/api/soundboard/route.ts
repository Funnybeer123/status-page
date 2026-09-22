import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { soundboardHeading, spokenNameLine } from "@/lib/soundboard";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, pronunciationAssetId: { not: null } },
    orderBy: { displayName: "asc" },
  });
  const assetIds = people.map((person) => person.pronunciationAssetId).filter((id): id is string => Boolean(id));
  const assets = assetIds.length
    ? await prisma.asset.findMany({ where: { id: { in: assetIds }, familyId: ctx.family.id, deletedAt: null } })
    : [];
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const items = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .map((person) => {
      const asset = person.pronunciationAssetId ? byId.get(person.pronunciationAssetId) : null;
      return {
        id: person.id,
        displayName: person.displayName,
        line: spokenNameLine(person.displayName, person.pronunciation),
        storagePath: asset?.storagePath || null,
        href: `/people/${person.id}`,
      };
    })
    .filter((item) => item.storagePath);
  return NextResponse.json({ heading: soundboardHeading(items.length), items });
}
