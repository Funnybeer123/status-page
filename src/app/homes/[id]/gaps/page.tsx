import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { occupancyByYear, occupancyGapHeading, occupancyGaps } from "@/lib/homeYears";

export default async function HomeGapsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const home = await prisma.familyHome.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residents: { include: { person: true } } },
  });
  if (!home) notFound();
  const years = occupancyByYear(
    home.residents.map((row) => ({
      personId: row.personId,
      name: row.person.displayName,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  const gaps = occupancyGaps(years);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Home</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="home-gaps-heading">{occupancyGapHeading(home.title, gaps.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Years when no one is recorded in the house.</p>
      <ul className="mt-10 space-y-3" data-testid="home-gaps-list">
        {gaps.map((year) => (
          <li key={year} className="paper-card p-5">
            <p className="font-display text-2xl">{year}</p>
            <p className="text-bark">No one recorded this year.</p>
          </li>
        ))}
        {!gaps.length ? <li className="text-bark">Someone is recorded in every year we know.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/homes/${home.id}/years`} className="text-seal">Year by year</Link>
        {" · "}
        <Link href={`/homes/${home.id}`} className="text-seal">Back to the house</Link>
      </p>
    </AppShell>
  );
}
