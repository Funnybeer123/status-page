import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { compileNewsletter, monthKey } from "@/lib/newsletter";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const month = new URL(req.url).searchParams.get("month") || monthKey(new Date());
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { createdAt: "asc" },
  });
  const items = activities.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    href: activityHref(item.entityType, item.entityId),
    when: item.createdAt,
    kind: item.entityType,
  }));
  return NextResponse.json(compileNewsletter(items, month));
}
