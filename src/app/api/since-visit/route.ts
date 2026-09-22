import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { sinceVisitHeading, sinceVisitLine } from "@/lib/sinceVisit";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const visit = await prisma.familyVisit.findUnique({
    where: { userId_familyId: { userId: ctx.session.user.id, familyId: ctx.family.id } },
  });
  const firstVisit = !visit;
  const since = visit?.seenAt ?? new Date(0);
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id, createdAt: { gt: since } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    heading: sinceVisitHeading(activities.length, firstVisit),
    firstVisit,
    seenAt: visit?.seenAt ?? null,
    changes: activities.map((item) => ({
      id: item.id,
      title: item.title,
      line: sinceVisitLine(item.title, item.actor.name),
      href: activityHref(item.entityType, item.entityId),
      createdAt: item.createdAt,
    })),
  });
}

export async function POST() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const existing = await prisma.familyVisit.findUnique({
    where: { userId_familyId: { userId: ctx.session.user.id, familyId: ctx.family.id } },
  });
  const now = new Date();
  const visit = await prisma.familyVisit.upsert({
    where: { userId_familyId: { userId: ctx.session.user.id, familyId: ctx.family.id } },
    create: { userId: ctx.session.user.id, familyId: ctx.family.id, seenAt: now, previousAt: null },
    update: { previousAt: existing?.seenAt ?? now, seenAt: now },
  });
  return NextResponse.json({ visit, heading: sinceVisitHeading(0, !existing) });
}
