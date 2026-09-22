import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileThenNowMap, thenNowMapHeading } from "@/lib/thenNowMap";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const placeId = new URL(req.url).searchParams.get("placeId");
  const pairs = await prisma.photoPair.findMany({
    where: { familyId: ctx.family.id, ...(placeId ? { OR: [{ placeId }, { thenAsset: { placeId } }, { nowAsset: { placeId } }] } : {}) },
    include: {
      thenAsset: { include: { place: true } },
      nowAsset: { include: { place: true } },
      place: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const items = compileThenNowMap(pairs);
  return NextResponse.json({
    heading: items[0]?.heading || thenNowMapHeading(),
    items,
  });
}
