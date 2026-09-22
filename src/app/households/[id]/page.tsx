import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { householdHeading, memberLine } from "@/lib/censusCompare";

export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const household = await prisma.censusHousehold.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { people: { include: { person: true } } },
  });
  if (!household) notFound();
  const siblings = await prisma.censusHousehold.findMany({
    where: { familyId: ctx.family.id, groupKey: household.groupKey, id: { not: household.id } },
    orderBy: { year: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/households" className="text-seal">Households</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="household-heading">
        {householdHeading(household.place, household.year, household.street)}
      </h1>
      {household.notes ? <p className="mt-3 text-bark">{household.notes}</p> : null}
      {siblings.length ? (
        <p className="mt-4 font-sans text-sm">
          <Link href={`/census/compare?group=${encodeURIComponent(household.groupKey)}`} className="text-seal">
            Compare with another year
          </Link>
        </p>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="household-people">
        {household.people.map((row) => (
          <li key={row.personId} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            <p className="text-bark">{memberLine({
              personId: row.personId,
              name: row.person.displayName,
              role: row.role,
              age: row.age,
              occupation: row.occupation,
            })}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
