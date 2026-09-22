import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BellForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { churchBellLine, churchBellsHeading, compileBells } from "@/lib/churchBell";

export default async function BellsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.churchBell.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBells(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      service: row.service,
      rangOn: row.rangOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bells-heading">
        {churchBellsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who rang the church bell, and for which service.{" "}
        <Link href="/bells/missing" className="text-seal">Missing bell ringer</Link>
      </p>
      {canWrite(ctx.role) ? (
        <BellForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="bells-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{churchBellLine(row.person, row.service, row.rangKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{churchBellsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={churchBellsHeading(compiled.length)} path="/bells" />
    </AppShell>
  );
}
