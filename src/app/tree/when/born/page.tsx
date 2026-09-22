import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bornInYear, bornThatYearHeading, parseAliveYear } from "@/lib/aliveWhen";
import { lifespan } from "@/lib/dates";
import { hideMinorDetails } from "@/lib/privacy";

export default async function BornThatYearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const year = parseAliveYear((await searchParams).year);
  const people = (await prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }))
    .filter((person) => bornInYear(person, year) && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="born-year-heading">
        {bornThatYearHeading(year, people.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href={`/tree/when?year=${year}`} className="text-seal">Who was alive in {year}</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="born-year-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
            <p className="text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
          </li>
        ))}
        {!people.length ? <li className="text-bark">{bornThatYearHeading(year, 0)}</li> : null}
      </ul>
    </AppShell>
  );
}
