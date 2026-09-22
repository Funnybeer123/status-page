import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/dates";
import { unitHeading, unitRosterLine } from "@/lib/militaryUnit";

export default async function MilitaryUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const unit = await prisma.militaryUnit.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { services: { include: { person: true } } },
  });
  if (!unit) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/military" className="text-seal">Military</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unit-heading">{unitHeading(unit.name, unit.services.length)}</h1>
      <p className="mt-3 text-bark">
        {[unit.branch, unit.place].filter(Boolean).join(" · ") || "The people who served in this unit."}
      </p>
      {unit.notes ? <p className="mt-2 text-bark">{unit.notes}</p> : null}
      <ul className="mt-10 space-y-3" data-testid="unit-roster">
        {unit.services.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            <p className="text-bark">
              {unitRosterLine({
                unitName: unit.name,
                personName: row.person.displayName,
                rank: row.rank,
                branch: row.branch,
              })}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!unit.services.length ? <li className="text-bark">No one linked to this unit yet.</li> : null}
      </ul>
    </AppShell>
  );
}
