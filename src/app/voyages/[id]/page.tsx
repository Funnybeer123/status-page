import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PassengerForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { compilePassengerList, passengerLine, voyagePassengerHeading } from "@/lib/passengers";

export default async function VoyagePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [voyage, people] = await Promise.all([
    prisma.voyage.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!voyage) notFound();
  const passengers = compilePassengerList(
    voyage.people.map((row) => ({
      personId: row.personId,
      name: row.person.displayName,
      age: row.age,
      role: row.role,
      notes: row.notes,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/voyages" className="text-seal">Voyages</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="passenger-heading">
        {voyagePassengerHeading(voyage.ship, passengers.length)}
      </h1>
      <p className="mt-3 text-bark">
        {voyage.departedFrom} → {voyage.arrivedAt}
        {voyage.departedOn ? ` · ${formatDate(voyage.departedOn)}` : ""}
      </p>
      {canWrite(ctx.role) ? (
        <PassengerForm voyageId={voyage.id} people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="passenger-list">
        {passengers.map((row) => (
          <li key={row.personId} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.name}</Link>
            <p className="text-bark">{passengerLine(row)}</p>
          </li>
        ))}
        {!passengers.length ? <li className="text-bark">No passengers named yet.</li> : null}
      </ul>
    </AppShell>
  );
}
