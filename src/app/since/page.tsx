import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { activityHref } from "@/lib/activity";
import { sinceVisitHeading, sinceVisitLine } from "@/lib/sinceVisit";
import { MarkVisitButton } from "@/app/funeral/ui";

export default async function SinceVisitPage() {
  const ctx = await requireFamily();
  const visit = await prisma.familyVisit.findUnique({
    where: { userId_familyId: { userId: ctx.session.user.id, familyId: ctx.family.id } },
  });
  const firstVisit = !visit;
  const since = visit?.seenAt ?? new Date(0);
  const activities = await prisma.activity.findMany({
    where: { familyId: ctx.family.id, createdAt: { gt: since } },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="since-visit-heading">{sinceVisitHeading(activities.length, firstVisit)}</h1>
      <p className="mt-3 max-w-2xl text-bark">What changed in the archive since you last looked, for the signed-in relative.</p>
      <MarkVisitButton />
      <ul className="mt-10 space-y-3" data-testid="since-visit-list">
        {activities.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={activityHref(item.entityType, item.entityId)} className="font-display text-2xl text-seal">
              {sinceVisitLine(item.title, item.actor.name)}
            </Link>
          </li>
        ))}
        {!activities.length ? <li className="text-bark">Nothing new to show.</li> : null}
      </ul>
    </AppShell>
  );
}
