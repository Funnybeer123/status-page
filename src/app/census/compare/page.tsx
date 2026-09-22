import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compareHeading, compareHouseholds, householdHeading, memberLine } from "@/lib/censusCompare";
import { scanHeading, scanLine } from "@/lib/scans";

export default async function CensusComparePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; a?: string; b?: string }>;
}) {
  const ctx = await requireFamily();
  const { group, a, b } = await searchParams;
  const households = await prisma.censusHousehold.findMany({
    where: {
      familyId: ctx.family.id,
      ...(group ? { groupKey: group } : {}),
      ...(a || b ? { id: { in: [a, b].filter(Boolean) as string[] } } : {}),
    },
    include: { people: { include: { person: true } }, scan: true },
    orderBy: { year: "asc" },
  });
  const earlier = households[0];
  const later = households[1] || households.find((row) => row.id !== earlier?.id);
  const left = (earlier?.people ?? []).map((row) => ({
    personId: row.personId,
    name: row.person.displayName,
    role: row.role,
    age: row.age,
    occupation: row.occupation,
  }));
  const right = (later?.people ?? []).map((row) => ({
    personId: row.personId,
    name: row.person.displayName,
    role: row.role,
    age: row.age,
    occupation: row.occupation,
  }));
  const compared = earlier && later ? compareHouseholds(left, right) : { stay: [], arrive: [], leave: [] };
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/households" className="text-seal">Households</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="census-compare-heading">
        {earlier && later ? compareHeading(earlier.place, earlier.year, later.year) : "Census comparison"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">The same household in two years, side by side: who stayed, who arrived, and who left. The census scan sits with each year.</p>
      {earlier?.scan || later?.scan ? (
        <p className="mt-2 font-sans text-sm text-gold" data-testid="census-scans">Census scans attached</p>
      ) : null}
      {earlier && later ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2" data-testid="census-compare">
          <section className="paper-card p-5">
            <h2 className="font-display text-2xl">{householdHeading(earlier.place, earlier.year, earlier.street)}</h2>
            {earlier.scan ? (
              <figure className="mt-4" data-testid="census-scan-earlier">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${earlier.scan.storagePath}`} alt={scanLine(earlier.scan.title)} className="w-full rounded-lg object-cover" />
                <figcaption className="mt-2 font-sans text-sm text-gold">{scanHeading("census", `${earlier.place}, ${earlier.year}`)}</figcaption>
              </figure>
            ) : (
              <p className="mt-4 font-sans text-sm text-bark">No scan attached yet.</p>
            )}
            <ul className="mt-4 space-y-2">
              {left.map((row) => (
                <li key={row.personId}>{memberLine(row)}</li>
              ))}
            </ul>
          </section>
          <section className="paper-card p-5">
            <h2 className="font-display text-2xl">{householdHeading(later.place, later.year, later.street)}</h2>
            {later.scan ? (
              <figure className="mt-4" data-testid="census-scan-later">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${later.scan.storagePath}`} alt={scanLine(later.scan.title)} className="w-full rounded-lg object-cover" />
                <figcaption className="mt-2 font-sans text-sm text-gold">{scanHeading("census", `${later.place}, ${later.year}`)}</figcaption>
              </figure>
            ) : (
              <p className="mt-4 font-sans text-sm text-bark">No scan attached yet.</p>
            )}
            <ul className="mt-4 space-y-2">
              {right.map((row) => (
                <li key={row.personId}>{memberLine(row)}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p className="mt-10 text-bark">Record the same household in two years to compare them.</p>
      )}
      {earlier && later ? (
        <div className="mt-10 grid gap-4 md:grid-cols-3" data-testid="census-compare-changes">
          <section className="paper-card p-5">
            <h3 className="font-display text-xl">Stayed</h3>
            <ul className="mt-3 space-y-1">{compared.stay.map((row) => <li key={row.personId}>{row.name}</li>)}</ul>
            {!compared.stay.length ? <p className="mt-3 text-bark">Nobody stayed.</p> : null}
          </section>
          <section className="paper-card p-5">
            <h3 className="font-display text-xl">Arrived</h3>
            <ul className="mt-3 space-y-1">{compared.arrive.map((row) => <li key={row.personId}>{row.name}</li>)}</ul>
            {!compared.arrive.length ? <p className="mt-3 text-bark">Nobody new.</p> : null}
          </section>
          <section className="paper-card p-5">
            <h3 className="font-display text-xl">Left</h3>
            <ul className="mt-3 space-y-1">{compared.leave.map((row) => <li key={row.personId}>{row.name}</li>)}</ul>
            {!compared.leave.length ? <p className="mt-3 text-bark">Nobody left.</p> : null}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
