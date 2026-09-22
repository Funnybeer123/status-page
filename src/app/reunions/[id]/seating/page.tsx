import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { groupSeats, seatLine, seatingHeading } from "@/lib/seating";
import { SeatForm } from "@/app/funeral/ui";

export default async function ReunionSeatingPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, people] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { seats: { include: { person: true }, orderBy: [{ tableName: "asc" }, { seat: "asc" }] } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!reunion) notFound();
  const tables = groupSeats(reunion.seats);
  return (
    <AppShell>
      <article className="print:max-w-none">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable seating chart</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="seating-heading">{seatingHeading(reunion.title, reunion.seats.length)}</h1>
        {canWrite(ctx.role) ? (
          <div className="print:hidden">
            <SeatForm reunionId={reunion.id} people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
          </div>
        ) : null}
        <div className="mt-10 grid gap-6 md:grid-cols-2" data-testid="seating-chart">
          {tables.map((table) => (
            <section key={table.tableName} className="paper-card p-5">
              <h2 className="font-display text-2xl">{table.tableName}</h2>
              <ul className="mt-3 space-y-2">
                {table.seats.map((row) => (
                  <li key={row.id} className="text-bark">{seatLine(row.person.displayName, row.tableName, row.seat)}</li>
                ))}
              </ul>
            </section>
          ))}
          {!tables.length ? <p className="text-bark">No one is seated yet.</p> : null}
        </div>
        <p className="mt-8 font-sans text-sm print:hidden">
          <Link href={`/reunions/${reunion.id}`} className="text-seal">Back to the reunion</Link>
          {" · "}
          <Link href="/reunions/seating/missing" className="text-seal">Reunions without a chart</Link>
        </p>
      </article>
    </AppShell>
  );
}
