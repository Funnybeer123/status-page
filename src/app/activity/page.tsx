import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { formatDate } from "@/lib/dates";

export default async function ActivityPage() {
  const ctx = await requireFamily();
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="activity-heading">Activity</h1>
      <p className="mt-3 max-w-2xl text-bark">Who added what — people, letters, photographs, stories, and comments.</p>
      <ol className="mt-10 space-y-3" data-testid="activity-list">
        {activities.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-sm text-gold">
              {item.actor.name} {item.verb} · {formatDate(item.createdAt)}
            </p>
            <Link href={activityHref(item.entityType, item.entityId)} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            {item.summary ? <p className="mt-1 text-bark">{item.summary}</p> : null}
          </li>
        ))}
        {!activities.length ? <li className="text-bark">The feed is quiet. A relative has not added anything yet.</li> : null}
      </ol>
    </AppShell>
  );
}
