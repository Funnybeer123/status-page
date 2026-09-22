import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NOTICE_CATEGORIES, isNoticeCategory, muteCategoryLine, mutedCategoriesHeading } from "@/lib/noticeMute";

const schema = z.object({
  category: z.string(),
  muted: z.boolean().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const mutes = await prisma.noticeMute.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
  });
  const muted = new Set(mutes.map((row) => row.category));
  const categories = NOTICE_CATEGORIES.map((category) => ({
    category,
    muted: muted.has(category),
    line: muteCategoryLine(category, muted.has(category)),
  }));
  return NextResponse.json({
    categories,
    heading: mutedCategoriesHeading(mutes.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success || !isNoticeCategory(body.data.category)) {
    return NextResponse.json({ error: "Choose a notice category to mute." }, { status: 400 });
  }
  const muted = body.data.muted ?? true;
  if (muted) {
    await prisma.noticeMute.upsert({
      where: {
        userId_familyId_category: {
          userId: ctx.session.user.id,
          familyId: ctx.family.id,
          category: body.data.category,
        },
      },
      create: { userId: ctx.session.user.id, familyId: ctx.family.id, category: body.data.category },
      update: {},
    });
  } else {
    await prisma.noticeMute.deleteMany({
      where: { userId: ctx.session.user.id, familyId: ctx.family.id, category: body.data.category },
    });
  }
  const mutes = await prisma.noticeMute.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
  });
  return NextResponse.json({
    category: body.data.category,
    muted,
    line: muteCategoryLine(body.data.category, muted),
    heading: mutedCategoriesHeading(mutes.length),
  });
}
