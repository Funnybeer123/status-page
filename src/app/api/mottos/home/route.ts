import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { homeMottoHeading, missingMottoHeading, pickHomeMotto } from "@/lib/homeMotto";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const mottos = await prisma.familyMotto.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { id: "asc" },
  });
  const motto = pickHomeMotto(mottos);
  return NextResponse.json({
    motto,
    heading: homeMottoHeading(),
    missingHeading: missingMottoHeading(motto ? 0 : 1),
  });
}
