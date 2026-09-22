import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PinForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSundayPins, sundayPinLine, sundayPinsHeading } from "@/lib/sundaySchoolPin";

export default async function PinsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.sundaySchoolPin.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSundayPins(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      year: row.year,
      church: row.church,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pins-heading">
        {sundayPinsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A Sunday-school attendance pin, and who earned it.{" "}
        <Link href="/map/pins" className="text-seal">Map pins</Link>
        {" · "}
        <Link href="/pins/missing" className="text-seal">Missing pin</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PinForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="pins-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{sundayPinLine(row.person, row.year, row.church)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{sundayPinsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={sundayPinsHeading(compiled.length)} path="/pins" />
    </AppShell>
  );
}
