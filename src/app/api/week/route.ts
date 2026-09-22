import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { compileThisWeek, thisWeekHeading, thisWeekSince } from "@/lib/thisWeek";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const since = thisWeekSince();
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id, createdAt: { gte: since } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const items = compileThisWeek(
    activities.map((item) => ({
      id: item.id,
      title: item.title,
      verb: item.verb,
      actorName: item.actor.name,
      createdAt: item.createdAt,
      href: activityHref(item.entityType, item.entityId),
    })),
  );
  return NextResponse.json({ items, heading: thisWeekHeading(items.length) });
}
