import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { familyOverlapsHeading, overlappingPairs, sortOccupations } from "@/lib/occupations";

export default async function OccupationOverlapsPage() {
  const ctx = await requireFamily();
  const records = await prisma.occupationRecord.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const byPerson = new Map<string, typeof records>();
  for (const row of records) {
    const list = byPerson.get(row.personId) ?? [];
    list.push(row);
    byPerson.set(row.personId, list);
  }
  const people = [...byPerson.entries()]
    .map(([personId, jobs]) => {
      const pairs = overlappingPairs(sortOccupations(jobs));
      return {
        personId,
        name: jobs[0]?.person.displayName ?? "Someone",
        lines: pairs.map((pair) => pair.line),
      };
    })
    .filter((row) => row.lines.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="overlaps-heading">
        {familyOverlapsHeading(people.length)}
      </h1>
      <ul className="mt-10 space-y-3">
        {people.map((row) => (
          <li key={row.personId} className="paper-card p-5">
            <Link href={`/people/${row.personId}/occupations`} className="font-display text-2xl text-seal">{row.name}</Link>
            {row.lines.map((line) => (
              <p key={line} className="text-bark">{line}</p>
            ))}
          </li>
        ))}
        {!people.length ? <li className="text-bark">No overlapping jobs in the family.</li> : null}
      </ul>
    </AppShell>
  );
}
