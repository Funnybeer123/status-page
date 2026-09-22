import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { RoadTaxForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileRoadTaxes, roadTaxLine, roadTaxesHeading } from "@/lib/roadTax";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.roadTax.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileRoadTaxes(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      road: row.road,
      days: row.days,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="road-tax-heading">
        {roadTaxesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who worked the road tax, which road, and how many days. 
        <Link href="/road-tax/missing" className="text-seal">Missing road tax</Link>
      </p>
      {canWrite(ctx.role) ? (
        <RoadTaxForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="road-tax-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{roadTaxLine(row.person, row.road, row.days, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{roadTaxesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={roadTaxesHeading(compiled.length)} path="/road-tax" />
    </AppShell>
  );
}
