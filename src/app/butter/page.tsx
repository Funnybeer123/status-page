import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ButterForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { butterEggLine, butterEggsHeading, compileButterEggs } from "@/lib/butterEgg";

export default async function ButterPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.butterEggAccount.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileButterEggs(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      store: row.store,
      account: row.account,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="butter-heading">
        {butterEggsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The butter-and-egg account at the general store.{" "}
        <Link href="/butter/missing" className="text-seal">Missing account</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ButterForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="butter-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{butterEggLine(row.person, row.store, row.account, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{butterEggsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={butterEggsHeading(compiled.length)} path="/butter" />
    </AppShell>
  );
}
