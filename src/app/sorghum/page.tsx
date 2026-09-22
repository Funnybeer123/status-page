import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SorghumForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSorghum, sorghumLine, sorghumHeading } from "@/lib/sorghumBoil";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.sorghumBoil.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSorghum(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      gallons: row.gallons,
      year: row.year,
      place: row.place,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="sorghum-heading">
        {sorghumHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who boiled the sorghum molasses, and how many gallons. 
        <Link href="/sorghum/missing" className="text-seal">Missing sorghum boil</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SorghumForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="sorghum-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{sorghumLine(row.person, row.gallons, row.place, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{sorghumHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={sorghumHeading(compiled.length)} path="/sorghum" />
    </AppShell>
  );
}
