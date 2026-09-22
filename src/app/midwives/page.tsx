import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MidwifeForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMidwives, midwifeLine, midwivesHeading } from "@/lib/midwife";

export default async function MidwivesPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.midwifeRecord.findMany({
      where: { familyId: ctx.family.id },
      include: { midwife: true, mother: true, child: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileMidwives(
    rows.map((row) => ({
      id: row.id,
      midwife: row.midwife.displayName,
      mother: row.mother.displayName,
      child: row.child?.displayName,
      attendedOn: row.attendedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="midwives-heading">
        {midwivesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The midwife at a birth — mother, child, and who attended.{" "}
        <Link href="/baptisms" className="text-seal">Baptisms</Link>
        {" · "}
        <Link href="/midwives/missing" className="text-seal">Missing midwife</Link>
      </p>
      {canWrite(ctx.role) ? (
        <MidwifeForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="midwives-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{midwifeLine(row.midwife, row.mother, row.child, row.attendKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{midwivesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={midwivesHeading(compiled.length)} path="/midwives" />
    </AppShell>
  );
}
