import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PeddlerForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePeddlers, peddlerLine, peddlersHeading } from "@/lib/peddler";

export default async function PeddlersPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.peddlerVisit.findMany({ where: { familyId: ctx.family.id }, include: { buyer: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compilePeddlers(
    rows.map((row) => ({
      id: row.id,
      peddler: row.peddler,
      goods: row.goods,
      buyer: row.buyer.displayName,
      visitedOn: row.visitedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="peddlers-heading">
        {peddlersHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who stopped, what they sold, and to whom.{" "}
        <Link href="/peddlers/missing" className="text-seal">Missing visit</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PeddlerForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="peddlers-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{peddlerLine(row.peddler, row.goods, row.buyer, row.visitKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{peddlersHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={peddlersHeading(compiled.length)} path="/peddlers" />
    </AppShell>
  );
}
