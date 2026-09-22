import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { WatchForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileDeathwatches, deathwatchLine, deathwatchesHeading } from "@/lib/deathwatch";

export default async function WatchesPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.deathwatch.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, deceased: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileDeathwatches(
    rows.map((row) => ({
      id: row.id,
      deceased: row.deceased.displayName,
      sitter: row.person.displayName,
      deceasedId: row.deceasedId,
      personId: row.personId,
      watchedOn: row.watchedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="watches-heading">
        {deathwatchesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who sat the deathwatch overnight.{" "}
        <Link href="/funerals" className="text-seal">Funeral programs</Link>
        {" · "}
        <Link href="/watches/missing" className="text-seal">Funerals still needing a deathwatch</Link>
      </p>
      {canWrite(ctx.role) ? (
        <WatchForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="watches-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{deathwatchLine(row.sitter, row.deceased, row.watchKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{deathwatchesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={deathwatchesHeading(compiled.length)} path="/watches" />
    </AppShell>
  );
}
