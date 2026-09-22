import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SmokehouseForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSmokehouse, smokehouseHeading, smokehouseLine } from "@/lib/smokehouse";

export default async function SmokehousePage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.smokehouseItem.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSmokehouse(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      item: row.item,
      hungOn: row.hungOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="smokehouse-heading">
        {smokehouseHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        What was hanging in the smokehouse, and whose meat it was.{" "}
        <Link href="/smokehouse/missing" className="text-seal">Missing inventory</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SmokehouseForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="smokehouse-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{smokehouseLine(row.item, row.person, row.hungKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{smokehouseHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={smokehouseHeading(compiled.length)} path="/smokehouse" />
    </AppShell>
  );
}
