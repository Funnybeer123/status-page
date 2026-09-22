import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/newsletter";
import { draftHeading, draftStatus, unpublishedDraftsHeading } from "@/lib/newsletterDraft";

const schema = z.object({
  month: z.string().optional(),
  body: z.string().min(1).max(20000),
  publish: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const month = new URL(req.url).searchParams.get("month") || monthKey(new Date());
  const drafts = await prisma.newsletterDraft.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { month: "desc" },
  });
  const draft = drafts.find((row) => row.month === month) ?? null;
  const unpublished = drafts.filter((row) => !row.publishedAt);
  return NextResponse.json({
    draft,
    drafts,
    heading: draft ? draftHeading(draft.month) : draftHeading(month),
    status: draftStatus(draft?.publishedAt),
    unpublishedHeading: unpublishedDraftsHeading(unpublished.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write the newsletter draft first." }, { status: 400 });
  const month = body.data.month || monthKey(new Date());
  const draft = await prisma.newsletterDraft.upsert({
    where: { familyId_month: { familyId: ctx.family.id, month } },
    create: {
      familyId: ctx.family.id,
      month,
      body: body.data.body,
      publishedAt: body.data.publish ? new Date() : null,
    },
    update: {
      body: body.data.body,
      publishedAt: body.data.publish ? new Date() : null,
    },
  });
  return NextResponse.json({
    draft,
    heading: draftHeading(draft.month),
    status: draftStatus(draft.publishedAt),
  });
}
