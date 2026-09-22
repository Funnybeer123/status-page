import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { WellForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileWells, wellLine, wellsHeading } from "@/lib/wellRecord";

export default async function WellsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.wellRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileWells(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      place: row.place,
      depth: row.depth,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="wells-heading">
        {wellsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        How deep the well was, and who dug it.{" "}
        <Link href="/wells/missing" className="text-seal">Missing well</Link>
      </p>
      {canWrite(ctx.role) ? (
        <WellForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="wells-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{wellLine(row.person, row.place, row.depth, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{wellsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={wellsHeading(compiled.length)} path="/wells" />
    </AppShell>
  );
}
