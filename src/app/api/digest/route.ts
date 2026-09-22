import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { loadFamilyReminders } from "@/lib/familyDates";
import { compileDayDigest, digestHeading, digestSubject, emptyDigestHeading } from "@/lib/dayDigest";
import { filterBirthdayReminders, loadMutedCategories } from "@/lib/noticeMute";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { reminders } = await loadFamilyReminders(ctx.family.id, ctx.role);
  const muted = await loadMutedCategories(ctx.family.id, ctx.session.user.id);
  const today = filterBirthdayReminders(reminders, muted);
  const [reunions, letters, journals] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, secretUntil: { not: null } },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: ctx.session.user.id, secretUntil: { not: null } },
    }),
  ]);
  const items = compileDayDigest({
    reminders: today,
    reunions,
    secrets: [
      ...letters.map((letter) => ({
        id: letter.id,
        title: letter.title,
        secretUntil: letter.secretUntil,
        href: `/letters/${letter.id}`,
      })),
      ...journals.map((entry) => ({
        id: entry.id,
        title: entry.title,
        secretUntil: entry.secretUntil,
        href: "/journal",
      })),
    ],
  });
  return NextResponse.json({
    heading: items.length ? digestHeading(items.length) : emptyDigestHeading(),
    subject: digestSubject(ctx.family.name, items.length),
    items,
  });
}
