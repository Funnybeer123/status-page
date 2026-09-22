import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { WillWitnessForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { compileWillWitnesses, willWitnessLine, willWitnessesHeading } from "@/lib/willWitnesses";

export default async function WillWitnessesPage() {
  const ctx = await requireFamily();
  const [rows, people, wills] = await Promise.all([
    prisma.willWitness.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, document: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.will, deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);
  const compiled = compileWillWitnesses(
    rows.map((row) => ({
      id: row.id,
      will: row.document.title,
      witness: row.person.displayName,
      stoodOn: row.stoodOn ? row.stoodOn.toISOString().slice(0, 10) : null,
      notes: row.notes,
      href: `/letters/${row.documentId}`,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="will-witnesses-heading">
        {willWitnessesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who stood for a will, with the date. Separate from event witnesses.{" "}
        <Link href="/wills" className="text-seal">Wills</Link>
        {" · "}
        <Link href="/witnesses" className="text-seal">Event witnesses</Link>
        {" · "}
        <Link href="/wills/witnesses/missing" className="text-seal">Wills without a witness</Link>
      </p>
      {canWrite(ctx.role) ? (
        <WillWitnessForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          wills={wills.map((will) => ({ id: will.id, title: will.title }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="will-witnesses-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={row.href || "/wills"} className="font-display text-2xl text-seal">{row.will}</Link>
            <p className="text-bark">{willWitnessLine(row.witness, row.stoodOn ? formatDate(row.stoodOn) : null)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{willWitnessesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
