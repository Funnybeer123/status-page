import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CarverForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { carverLine, carversHeading, compileCarvers } from "@/lib/headstoneCarver";

export default async function CarversPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.headstoneCarver.findMany({
      where: { familyId: ctx.family.id },
      include: { carver: true, person: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileCarvers(
    rows.map((row) => ({
      id: row.id,
      carver: row.carver.displayName,
      person: row.person.displayName,
      yard: row.yard,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="carvers-heading">
        {carversHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who carved the headstone, for whom, and in which yard.{" "}
        <Link href="/inscriptions" className="text-seal">Gravestone inscriptions</Link>
        {" · "}
        <Link href="/carvers/missing" className="text-seal">Missing carver</Link>
      </p>
      {canWrite(ctx.role) ? (
        <CarverForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="carvers-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{carverLine(row.carver, row.person, row.yard)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{carversHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={carversHeading(compiled.length)} path="/carvers" />
    </AppShell>
  );
}
