import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ShiftForm } from "@/app/story-circle/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileReunionShifts, shiftLine, shiftsHeading } from "@/lib/reunionShifts";

export default async function ReunionShiftsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, people] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { shifts: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!reunion) notFound();
  const shifts = compileReunionShifts(
    reunion.shifts.map((shift) => ({
      id: shift.id,
      personName: shift.person.displayName,
      label: shift.label,
      startsAt: shift.startsAt,
      notes: shift.notes,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Digitizing shifts</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shifts-heading">
        {shiftsHeading(reunion.title, shifts.length)}
      </h1>
      <p className="mt-3 text-bark">
        Volunteer to scan letters and photographs at the reunion.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Reunion</Link>
        {" · "}
        <Link href="/digitize" className="text-seal">Digitization queue</Link>
        {" · "}
        <Link href={`/reunions/${reunion.id}/roster`} className="text-seal">Printable roster</Link>
        {" · "}
        <Link href="/reunions/shifts/missing" className="text-seal">Reunions without shifts</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ShiftForm
          reunionId={reunion.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="shifts-list">
        {shifts.map((shift) => (
          <li key={shift.id} className="paper-card p-5">
            <p className="font-display text-2xl">{shiftLine(shift.personName, shift.label, shift.startsAt)}</p>
            {shift.notes ? <p className="text-bark">{shift.notes}</p> : null}
          </li>
        ))}
        {!shifts.length ? <li className="text-bark">{shiftsHeading(reunion.title, 0)}</li> : null}
      </ul>
      <CiteBlock title={shiftsHeading(reunion.title, shifts.length)} path={`/reunions/${reunion.id}/shifts`} />
    </AppShell>
  );
}
