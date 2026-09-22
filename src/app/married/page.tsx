import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { compileYearsMarried, marriedHeading } from "@/lib/marriedYears";

export default async function MarriedYearsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, deathDate: true },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const rows = compileYearsMarried(people, relationships);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="married-heading">
        {marriedHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Years married for each couple, counted from the wedding day to today, a parting, or the first death.
        Separate from the reunion countdown and from death anniversaries.{" "}
        <Link href="/marriages" className="text-seal">Age at marriage</Link>
        {" · "}
        <Link href="/anniversaries" className="text-seal">Death anniversaries</Link>
        {" · "}
        <Link href="/hour" className="text-seal">Family hour</Link>
        {" · "}
        <Link href="/married/longest" className="text-seal">Longest marriage</Link>
        {" · "}
        <Link href="/married/missing" className="text-seal">Couples without a wedding date</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="married-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl text-seal">{row.line}</p>
            <p className="text-bark">
              Married {formatDate(row.startedOn)} ·{" "}
              <Link href={`/people/${row.aId}`} className="text-seal">{row.aName}</Link>
              {" · "}
              <Link href={`/people/${row.bId}`} className="text-seal">{row.bName}</Link>
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{marriedHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={marriedHeading(rows.length)} path="/married" />
    </AppShell>
  );
}
