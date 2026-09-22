import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { anniversaryHeading, anniversaryLine, deathAnniversaries } from "@/lib/milestones";

export default async function AnniversariesPage({
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
  const rows = deathAnniversaries(people, year);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="anniversaries-heading">{anniversaryHeading(year, rows.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">1, 10, 25, 50, 75, or 100 years since a death the family still marks.</p>
      <ul className="mt-10 space-y-3" data-testid="anniversaries-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark">{anniversaryLine(row.displayName, row.years, year)}</p>
            <p className="font-sans text-sm text-gold">{formatDate(row.deathDate)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No marked death anniversaries in {year}.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/milestones" className="text-seal">Milestone birthdays</Link>
      </p>
    </AppShell>
  );
}
