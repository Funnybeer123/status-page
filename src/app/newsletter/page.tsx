import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { compileNewsletter, monthKey } from "@/lib/newsletter";
import { formatDate } from "@/lib/dates";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const month = params.month || monthKey(new Date());
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const compiled = compileNewsletter(
    activities.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      href: activityHref(item.entityType, item.entityId),
      when: item.createdAt,
      kind: item.entityType,
    })),
    month,
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="newsletter-heading">{compiled.heading}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Assembled from what relatives added this month: {compiled.counts.people} people, {compiled.counts.letters} letters, {compiled.counts.photos} photographs.{" "}
        <Link href={`/newsletter/draft?month=${month}`} className="text-seal">Edit the draft before it goes out</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="newsletter-list">
        {compiled.items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            {item.summary ? <p className="text-bark">{item.summary}</p> : null}
            <p className="font-sans text-sm text-gold">{formatDate(item.when, "")}</p>
          </li>
        ))}
        {!compiled.items.length ? <li className="text-bark">Quiet month. Add a letter or a photograph.</li> : null}
      </ul>
    </AppShell>
  );
}
