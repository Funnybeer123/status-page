import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ElevatorForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileElevators, elevatorLine, elevatorsHeading } from "@/lib/grainElevator";

export default async function ElevatorsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.grainElevatorAccount.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileElevators(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      elevator: row.elevator,
      account: row.account,
      year: row.year,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="elevators-heading">
        {elevatorsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The grain-elevator account a farm kept, and whose name was on the book.{" "}
        <Link href="/elevators/missing" className="text-seal">Missing elevator account</Link>
        {" · "}
        <Link href="/farms" className="text-seal">Farms</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ElevatorForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="elevators-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{elevatorLine(row.person, row.elevator, row.account, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{elevatorsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={elevatorsHeading(compiled.length)} path="/elevators" />
    </AppShell>
  );
}
