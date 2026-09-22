import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ThreshingForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileThreshing, threshingHeading, threshingLine } from "@/lib/threshing";

export default async function ThreshingPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.threshingRing.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileThreshing(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      year: row.year,
      place: row.place,
      role: row.role,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="threshing-heading">
        {threshingHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Neighbors who worked the threshing ring, and the part each person held.{" "}
        <Link href="/threshing/missing" className="text-seal">Empty threshing ring</Link>
        {" · "}
        <Link href="/apprentices" className="text-seal">Apprenticeships</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ThreshingForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="threshing-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{threshingLine(row.person, row.year, row.role)}</p>
            {row.place ? <p className="mt-2 text-bark">{row.place}</p> : null}
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{threshingHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={threshingHeading(compiled.length)} path="/threshing" />
    </AppShell>
  );
}
