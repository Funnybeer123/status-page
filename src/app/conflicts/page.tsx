import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AlternateDateForm, PreferDate } from "@/app/conflicts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { findDateConflicts } from "@/lib/conflicts";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function ConflictsPage() {
  const ctx = await requireFamily();
  const [people, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.lifeEvent.findMany({ where: { familyId: ctx.family.id, kind: { in: ["birth", "death"] } } }),
  ]);
  const conflicts = findDateConflicts({ people, events });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="conflicts-heading">Conflicting facts</h1>
      <p className="mt-3 max-w-2xl text-bark">Two birth dates or two death dates. Mark the one the family prefers.</p>
      {canWrite(ctx.role) ? (
        <AlternateDateForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-4" data-testid="conflicts-list">
        {conflicts.map((item) => (
          <li key={`${item.personId}-${item.kind}`} className="paper-card p-5">
            <Link href={`/people/${item.personId}`} className="font-display text-2xl text-seal">{item.displayName}</Link>
            <p className="font-sans text-sm uppercase tracking-wide text-gold">{item.kind}</p>
            <ul className="mt-3 space-y-2">
              {item.dates.map((date) => (
                <li key={date.happenedOn} className="flex flex-wrap items-baseline justify-between gap-3">
                  <span>{formatDate(date.happenedOn)}{date.preferred ? " · preferred" : ""}</span>
                  {canWrite(ctx.role) && !date.preferred ? (
                    <PreferDate personId={item.personId} kind={item.kind} eventId={date.eventId} happenedOn={date.happenedOn} />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
        {!conflicts.length ? <li className="text-bark">No conflicting dates yet.</li> : null}
      </ul>
    </AppShell>
  );
}
