import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PartyLineForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePartyLines, partyLineLine, partyLinesHeading } from "@/lib/partyLine";

export default async function PartyLinesPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.partyLine.findMany({
      where: { familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compilePartyLines(
    rows.map((row) => ({
      id: row.id,
      exchange: row.exchange,
      number: row.number,
      people: row.people.map((link) => link.person.displayName),
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="party-lines-heading">
        {partyLinesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The shared party-line number, separate from the modern phone tree.{" "}
        <Link href="/phone-tree" className="text-seal">Phone tree</Link>
        {" · "}
        <Link href="/party-lines/missing" className="text-seal">Missing party line</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PartyLineForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="party-lines-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{partyLineLine(row.exchange, row.number, row.people)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{partyLinesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={partyLinesHeading(compiled.length)} path="/party-lines" />
    </AppShell>
  );
}
