import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingInterviewHeading } from "@/lib/familyHour";
import { compileInterviewList } from "@/lib/toInterview";

export default async function MissingInterviewDatesPage() {
  const ctx = await requireFamily();
  const [people, answered, planned] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null, deathDate: null } }),
    prisma.interviewAnswer.findMany({ where: { familyId: ctx.family.id }, select: { personId: true } }),
    prisma.interviewPlan.findMany({ where: { familyId: ctx.family.id }, select: { personId: true } }),
  ]);
  const plannedIds = new Set(planned.map((row) => row.personId));
  const waiting = compileInterviewList(
    people,
    answered.map((row) => row.personId),
  ).filter((person) => !plannedIds.has(person.id));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-interview-heading">
        {missingInterviewHeading(waiting.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/hour" className="text-seal">Family hour</Link>
        {" · "}
        <Link href="/to-interview" className="text-seal">Who to interview</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-interview-list">
        {waiting.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/interviews?personId=${person.id}`} className="font-display text-2xl text-seal">
              {person.name}
            </Link>
          </li>
        ))}
        {!waiting.length ? <li className="text-bark">{missingInterviewHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
