import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    activities: activities.map((item) => ({
      ...item,
      href: activityHref(item.entityType, item.entityId),
    })),
  });
}
