import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBringHeading } from "@/lib/reunionBring";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { brings: true, dishes: true },
    orderBy: { happenedOn: "desc" },
  });
  const missing = reunions.filter((row) => !row.brings.length && !row.dishes.length);
  return NextResponse.json({
    reunions: missing,
    heading: missingBringHeading(missing.length),
  });
}
