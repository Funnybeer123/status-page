import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { RodForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileRods, lightningRodLine, lightningRodsHeading } from "@/lib/lightningRod";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.lightningRod.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileRods(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      building: row.building,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="rods-heading">
        {lightningRodsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Which building got the rods, and who put them up. 
        <Link href="/rods/missing" className="text-seal">Missing lightning rod</Link>
      </p>
      {canWrite(ctx.role) ? (
        <RodForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="rods-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{lightningRodLine(row.person, row.building, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{lightningRodsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={lightningRodsHeading(compiled.length)} path="/rods" />
    </AppShell>
  );
}
