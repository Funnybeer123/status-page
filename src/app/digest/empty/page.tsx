import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { loadFamilyReminders } from "@/lib/familyDates";
import { compileDayDigest, emptyDigestHeading } from "@/lib/dayDigest";
import { filterBirthdayReminders, loadMutedCategories } from "@/lib/noticeMute";

export default async function EmptyDigestPage() {
  const ctx = await requireFamily();
  const { reminders } = await loadFamilyReminders(ctx.family.id, ctx.role);
  const muted = await loadMutedCategories(ctx.family.id, ctx.session.user.id);
  const today = filterBirthdayReminders(reminders, muted);
  const reunions = await prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id } });
  const items = compileDayDigest({ reminders: today, reunions, secrets: [] });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-digest-heading">
        {items.length ? digestBusyHeading(items.length) : emptyDigestHeading()}
      </h1>
      <p className="mt-8 font-sans text-sm">
        <Link href="/digest" className="text-seal">
          Start of the day
        </Link>
      </p>
    </AppShell>
  );
}

function digestBusyHeading(count: number) {
  return count === 1 ? "1 thing is already due today" : `${count} things are already due today`;
}
