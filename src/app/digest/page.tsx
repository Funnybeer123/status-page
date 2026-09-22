import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { loadFamilyReminders } from "@/lib/familyDates";
import { compileDayDigest, digestHeading, digestSubject, emptyDigestHeading } from "@/lib/dayDigest";
import { filterBirthdayReminders, loadMutedCategories } from "@/lib/noticeMute";

export default async function DigestPage() {
  const ctx = await requireFamily();
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
  const heading = items.length ? digestHeading(items.length) : emptyDigestHeading();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="digest-heading">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A start-of-the-day digest email preview.{" "}
        <Link href="/tomorrow" className="text-seal">
          Tomorrow
        </Link>
        {" · "}
        <Link href="/digest/empty" className="text-seal">
          A quiet morning
        </Link>
      </p>
      <article className="paper-card mt-10 p-6" data-testid="digest-preview">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">From Family Lineage</p>
        <p className="mt-2 font-display text-2xl" data-testid="digest-subject">
          {digestSubject(ctx.family.name, items.length)}
        </p>
        <ul className="mt-6 space-y-3" data-testid="digest-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="font-display text-xl text-seal">
                {item.title}
              </Link>
              {item.detail ? <p className="text-bark">{item.detail}</p> : null}
            </li>
          ))}
          {!items.length ? <li className="text-bark">{emptyDigestHeading()}</li> : null}
        </ul>
      </article>
      <CiteBlock title={heading} path="/digest" />
    </AppShell>
  );
}
