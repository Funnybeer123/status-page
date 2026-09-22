import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { HouseholdForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { householdHeading, memberLine } from "@/lib/censusCompare";

export default async function HouseholdsPage() {
  const ctx = await requireFamily();
  const [people, households] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.censusHousehold.findMany({
      where: { familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
      orderBy: [{ year: "asc" }, { place: "asc" }],
    }),
  ]);
  const groups = new Map<string, typeof households>();
  for (const household of households) {
    groups.set(household.groupKey, [...(groups.get(household.groupKey) ?? []), household]);
  }
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="households-heading">Census households</h1>
      <p className="mt-3 max-w-2xl text-bark">
        The same house across years. Compare who stayed, who arrived, and who left.
      </p>
      {canWrite(ctx.role) ? (
        <HouseholdForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-4" data-testid="households-list">
        {households.map((household) => (
          <li key={household.id} className="paper-card p-5">
            <Link href={`/households/${household.id}`} className="font-display text-2xl text-seal">
              {householdHeading(household.place, household.year, household.street)}
            </Link>
            <p className="mt-2 text-bark">
              {household.people.map((row) => memberLine({
                personId: row.personId,
                name: row.person.displayName,
                role: row.role,
                age: row.age,
                occupation: row.occupation,
              })).join("; ")}
            </p>
            {(groups.get(household.groupKey) ?? []).length > 1 ? (
              <p className="mt-3 font-sans text-sm">
                <Link href={`/census/compare?group=${encodeURIComponent(household.groupKey)}`} className="text-seal">
                  Compare this household
                </Link>
              </p>
            ) : null}
          </li>
        ))}
        {!households.length ? <li className="text-bark">No census households yet.</li> : null}
      </ul>
    </AppShell>
  );
}
