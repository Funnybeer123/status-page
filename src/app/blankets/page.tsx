import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BlanketForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { blanketLine, blanketsHeading, compileBlankets } from "@/lib/graveBlanket";

export default async function BlanketsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.graveBlanket.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, placedBy: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBlankets(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      monthDay: row.monthDay,
      placedBy: row.placedBy?.displayName,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="blankets-heading">
        {blanketsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        When a grave blanket is placed, and who lays it.{" "}
        <Link href="/blankets/missing" className="text-seal">Empty grave-blanket schedule</Link>
      </p>
      {canWrite(ctx.role) ? (
        <BlanketForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="blankets-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{blanketLine(row.person, row.monthDay, row.placedBy)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{blanketsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={blanketsHeading(compiled.length)} path="/blankets" />
    </AppShell>
  );
}
