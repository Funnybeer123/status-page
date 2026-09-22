import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BrandForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { brandYears, cattleBrandLine, cattleBrandsHeading, compileBrands } from "@/lib/cattleBrand";

export default async function BrandsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.cattleBrand.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBrands(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      mark: row.mark,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="brands-heading">
        {cattleBrandsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The cattle brand: the mark, whose stock, and the years it was used.{" "}
        <Link href="/brands/missing" className="text-seal">Missing brand</Link>
      </p>
      {canWrite(ctx.role) ? (
        <BrandForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="brands-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{cattleBrandLine(row.mark, row.person, brandYears(row.startedOn, row.endedOn))}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{cattleBrandsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={cattleBrandsHeading(compiled.length)} path="/brands" />
    </AppShell>
  );
}
