import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { WashForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails } from "@/lib/privacy";
import { canWrite } from "@/lib/roles";
import { compileWashDays, washDayLine, washDaysHeading } from "@/lib/washDay";

export default async function WashPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.washDay.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileWashDays(
    rows
      .filter((row) => !hideMinorDetails(ctx.role, row.person))
      .map((row) => ({
        id: row.id,
        person: row.person.displayName,
        weekday: row.weekday,
      })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="wash-heading">
        {washDaysHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Which weekday each household set aside for the wash.{" "}
        <Link href="/wash/missing" className="text-seal">Missing wash day</Link>
      </p>
      {canWrite(ctx.role) ? (
        <WashForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="wash-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{washDayLine(row.person, row.weekday)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{washDaysHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={washDaysHeading(compiled.length)} path="/wash" />
    </AppShell>
  );
}
