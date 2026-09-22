import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileThenNowMap, missingThenNowHeading } from "@/lib/thenNowMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const pairs = await prisma.photoPair.findMany({
    where: { familyId: ctx.family.id },
    include: {
      thenAsset: { include: { place: true } },
      nowAsset: { include: { place: true } },
      place: true,
    },
  });
  const mapped = new Set(compileThenNowMap(pairs).map((item) => item.id));
  const missing = pairs.filter((pair) => !mapped.has(pair.id)).map((pair) => ({ id: pair.id, title: pair.title }));
  return NextResponse.json({ heading: missingThenNowHeading(missing.length), pairs: missing });
}
