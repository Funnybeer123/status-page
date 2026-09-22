import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { InterviewPlanForm } from "@/app/family-hour/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileFamilyHour, countdownLine } from "@/lib/familyHour";

export default async function FamilyHourPage() {
  const ctx = await requireFamily();
  const [reunions, plans, people] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id } }),
    prisma.interviewPlan.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const hour = compileFamilyHour([
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
      <h1 className="mt-2 font-display text-4xl" data-testid="family-hour-heading">
        {hour.heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A shared countdown until the next reunion or interview.{" "}
        <Link href="/hour/empty" className="text-seal">A quiet hour</Link>
        {" · "}
        <Link href="/hour/past" className="text-seal">Already happened</Link>
        {" · "}
        <Link href="/hour/interviews/missing" className="text-seal">Interviews without a date</Link>
        {" · "}
        <Link href="/married" className="text-seal">Years married</Link>
      </p>
      <p className="mt-6 font-display text-3xl" data-testid="family-hour-countdown">
        {hour.line}
      </p>
      {canWrite(ctx.role) ? (
        <InterviewPlanForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="family-hour-list">
        {hour.upcoming.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <Link href={event.href} className="font-display text-2xl text-seal">
              {countdownLine(event.title, event.happenedOn)}
            </Link>
          </li>
        ))}
        {!hour.upcoming.length ? <li className="text-bark">{hour.heading}</li> : null}
      </ul>
      <CiteBlock title={hour.heading} path="/hour" />
    </AppShell>
  );
}
