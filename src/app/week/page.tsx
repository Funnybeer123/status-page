import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { compileThisWeek, thisWeekHeading, thisWeekSince } from "@/lib/thisWeek";

export default async function WeekPage() {
  const ctx = await requireFamily();
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id, createdAt: { gte: thisWeekSince() } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const items = compileThisWeek(
    activities.map((item) => ({
      id: item.id,
      title: item.title,
      verb: item.verb,
      actorName: item.actor.name,
      createdAt: item.createdAt,
      href: activityHref(item.entityType, item.entityId),
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="week-heading">{thisWeekHeading(items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">What relatives added in the last seven days.</p>
      <ul className="mt-10 space-y-3" data-testid="week-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-sm text-gold">{item.actorName} {item.verb}</p>
            <Link href={item.href || "/activity"} className="font-display text-2xl text-seal">{item.title}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing new this week.</li> : null}
      </ul>
    </AppShell>
  );
}
