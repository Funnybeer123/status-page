import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { NOTICE_CATEGORIES, muteCategoryLine, mutedCategoriesHeading } from "@/lib/noticeMute";
import { NoticeMuteForm } from "@/app/ask-save/ui";

export default async function MutedNoticesPage() {
  const ctx = await requireFamily();
  const mutes = await prisma.noticeMute.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
  });
  const muted = new Set(mutes.map((row) => row.category));
  const categories = NOTICE_CATEGORIES.map((category) => ({
    category,
    muted: muted.has(category),
    line: muteCategoryLine(category, muted.has(category)),
  }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="muted-notices-heading">
        {mutedCategoriesHeading(mutes.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Mute a whole notice category, such as birthdays or new uploads.{" "}
        <Link href="/notifications" className="text-seal">Back to notices</Link>.
      </p>
      <NoticeMuteForm categories={categories} />
    </AppShell>
  );
}
