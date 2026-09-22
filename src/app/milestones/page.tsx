import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { milestoneBirthdays, milestoneHeading, milestoneLine } from "@/lib/milestones";

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const { year: yearParam } = await searchParams;
  const year = Number.parseInt(yearParam || "", 10) || new Date().getUTCFullYear();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, displayName: true, birthDate: true, deathDate: true },
  });
  const rows = milestoneBirthdays(people, year);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="milestones-heading">{milestoneHeading(year, rows.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Who turns 80, 90, or 100 this year — the living elders the family should write to.</p>
      <form className="mt-6 flex flex-wrap gap-3 font-sans text-sm" action="/milestones">
        <input type="number" name="year" defaultValue={year} className="w-28 rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button className="rounded-full bg-seal px-4 py-2 text-cream" type="submit">Show year</button>
      </form>
      <ul className="mt-10 space-y-3" data-testid="milestones-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark">{milestoneLine(row.displayName, row.age, year)}</p>
            <p className="font-sans text-sm text-gold">{formatDate(row.birthDate)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No 80th, 90th, or 100th birthdays in {year}.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/anniversaries" className="text-seal">Death anniversaries</Link>
        {" · "}
        <Link href="/dates" className="text-seal">Family dates</Link>
      </p>
    </AppShell>
  );
}
