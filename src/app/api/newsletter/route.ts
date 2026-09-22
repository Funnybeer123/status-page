import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { compileNewsletter, monthKey } from "@/lib/newsletter";
import { withDraft } from "@/lib/newsletterDraft";

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
  const compiled = compileNewsletter(items, month);
  const draft = await prisma.newsletterDraft.findUnique({
    where: { familyId_month: { familyId: ctx.family.id, month } },
  });
  return NextResponse.json(withDraft(compiled, draft));
}
