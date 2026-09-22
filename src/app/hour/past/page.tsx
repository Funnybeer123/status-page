import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePastHour, countdownLine, pastHourHeading } from "@/lib/familyHour";

export default async function PastHourPage() {
  const ctx = await requireFamily();
  const [reunions, plans] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id } }),
    prisma.interviewPlan.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
  ]);
  const past = compilePastHour([
    ...reunions.map((reunion) => ({
      id: reunion.id,
      kind: "reunion" as const,
      title: reunion.title,
      happenedOn: reunion.happenedOn,
      href: `/reunions/${reunion.id}`,
    })),
    ...plans.map((plan) => ({
      id: plan.id,
      kind: "interview" as const,
      title: `Interview · ${plan.person.displayName}`,
      happenedOn: plan.scheduledOn,
      href: `/interviews?personId=${plan.personId}`,
    })),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="past-hour-heading">
        {pastHourHeading(past.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="past-hour-list">
        {past.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <Link href={event.href} className="font-display text-2xl text-seal">
              {countdownLine(event.title, event.happenedOn)}
            </Link>
          </li>
        ))}
        {!past.length ? <li className="text-bark">{pastHourHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
