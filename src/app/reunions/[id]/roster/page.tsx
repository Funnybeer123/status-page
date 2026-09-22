import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileReunionShifts, shiftLine, shiftRosterHeading } from "@/lib/reunionShifts";

export default async function ShiftRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { shifts: { include: { person: true } } },
  });
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
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold print:hidden">Printable roster</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shift-roster-heading">
        {shiftRosterHeading(reunion.title)}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        <Link href={`/reunions/${reunion.id}/shifts`} className="text-seal">Sign up for a shift</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="shift-roster">
        {shifts.map((shift) => (
          <li key={shift.id} className="paper-card p-5">
            {shiftLine(shift.personName, shift.label, shift.startsAt)}
          </li>
        ))}
        {!shifts.length ? <li className="text-bark">No one has signed up yet.</li> : null}
      </ul>
    </AppShell>
  );
}
