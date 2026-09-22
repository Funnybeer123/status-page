import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { RecitalForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { christmasPartLine, compileRecitals, recitalsHeading } from "@/lib/christmasPart";

export default async function RecitalsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.christmasPart.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileRecitals(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      piece: row.piece,
      kind: row.kind,
      heldOn: row.heldOn,
      place: row.place,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="recitals-heading">
        {recitalsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who recited or sang at the Christmas program, and which piece.{" "}
        <Link href="/programs" className="text-seal">Reunion programs</Link>
        {" · "}
        <Link href="/recitals/missing" className="text-seal">Missing part</Link>
      </p>
      {canWrite(ctx.role) ? (
        <RecitalForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="recitals-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{christmasPartLine(row.person, row.kind, row.piece, row.heldKey)}</p>
            {row.place ? <p className="font-sans text-sm text-bark">{row.place}</p> : null}
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{recitalsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={recitalsHeading(compiled.length)} path="/recitals" />
    </AppShell>
  );
}
