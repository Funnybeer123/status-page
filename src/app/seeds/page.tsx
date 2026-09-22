import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SeedForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSeedOrders, seedOrderLine, seedOrdersHeading } from "@/lib/seedOrder";

export default async function SeedsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.seedOrder.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSeedOrders(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      variety: row.variety,
      quantity: row.quantity,
      supplier: row.supplier,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="seeds-heading">
        {seedOrdersHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The spring seed order: variety, quantity, and the supplier.{" "}
        <Link href="/seeds/missing" className="text-seal">Missing seed order</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SeedForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="seeds-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{seedOrderLine(row.variety, row.quantity, row.supplier)}</p>
            <p className="text-bark">{row.person}{row.year ? ` · ${row.year}` : ""}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{seedOrdersHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={seedOrdersHeading(compiled.length)} path="/seeds" />
    </AppShell>
  );
}
