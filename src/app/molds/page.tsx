import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MoldForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { butterMoldLine, compileMolds, moldsHeading } from "@/lib/butterMold";

export default async function MoldsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.butterMold.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileMolds(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      mark: row.mark,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="molds-heading">
        {moldsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A butter-mold mark, and whose churn it belonged to.{" "}
        <Link href="/butter" className="text-seal">Butter and eggs</Link>
        {" · "}
        <Link href="/molds/missing" className="text-seal">Missing mark</Link>
      </p>
      {canWrite(ctx.role) ? (
        <MoldForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="molds-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{butterMoldLine(row.person, row.mark)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{moldsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={moldsHeading(compiled.length)} path="/molds" />
    </AppShell>
  );
}
