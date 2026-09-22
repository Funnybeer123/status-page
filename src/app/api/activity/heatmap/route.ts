import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileActivityHeatmap } from "@/lib/activityHeatmap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    select: { createdAt: true },
  });
  return NextResponse.json(compileActivityHeatmap(activities));
}
