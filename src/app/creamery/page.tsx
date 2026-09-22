import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CreameryForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileCreamery, creameryLine, creameryHeading } from "@/lib/creameryCheck";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.creameryCheck.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileCreamery(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      pounds: row.pounds,
      amount: row.amount,
      paidOn: row.paidOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="creamery-heading">
        {creameryHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The creamery check: date, pounds of cream, and amount paid. 
        <Link href="/creamery/missing" className="text-seal">Missing creamery check</Link>
      </p>
      {canWrite(ctx.role) ? (
        <CreameryForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="creamery-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{creameryLine(row.person, row.pounds, row.amount, row.paidKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{creameryHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={creameryHeading(compiled.length)} path="/creamery" />
    </AppShell>
  );
}
