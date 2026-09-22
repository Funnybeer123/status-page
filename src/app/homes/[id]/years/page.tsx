import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { collapseOccupancy, occupancyByYear, occupancyHeading, occupancySpanLine } from "@/lib/homeYears";

export default async function HomeYearsPage({ params }: { params: Promise<{ id: string }> }) {
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
  const spans = collapseOccupancy(years);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Home</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="home-years-heading">{occupancyHeading(home.title)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Who lived in the house, year by year.</p>
      <ol className="mt-10 space-y-3" data-testid="home-years-list">
        {spans.map((span) => (
          <li key={`${span.from}-${span.to}`} className="paper-card p-5">
            <p className="font-display text-2xl">{occupancySpanLine(span)}</p>
            <p className="text-bark">
              {span.people.map((person) => (
                <span key={person.id}>
                  <Link href={`/people/${person.id}`} className="text-seal">{person.name}</Link>
                  {" "}
                </span>
              ))}
              {!span.people.length ? "No one recorded these years." : null}
            </p>
          </li>
        ))}
        {!spans.length ? <li className="text-bark">Add who lived here, with years.</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/homes/${home.id}/gaps`} className="text-seal">Empty years</Link>
        {" · "}
        <Link href={`/homes/${home.id}`} className="text-seal">Back to the house</Link>
      </p>
    </AppShell>
  );
}
