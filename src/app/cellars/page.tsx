import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CellarForm, CellarGuestForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { cellarGuestLine, cellarHeading, cellarsHeading, compileCellarGuests, compileCellars } from "@/lib/cycloneCellar";

export default async function CellarsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.cycloneCellar.findMany({
      where: { familyId: ctx.family.id },
      include: { guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileCellars(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cellars-heading">
        {cellarsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who sheltered in the cyclone cellar, and during which storm.{" "}
        <Link href="/cellars/missing" className="text-seal">Cellars still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <CellarForm />
          <CellarGuestForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            cellars={compiled.map((row) => ({ id: row.id, title: cellarHeading(row.storm, row.guests.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="cellars-list">
        {compiled.map((row) => {
          const guests = compileCellarGuests(
            row.guests.map((guest) => ({
              id: guest.id,
              person: guest.person.displayName,
              personId: guest.personId,
            })),
          );
          return (
            <li key={row.id} className="paper-card p-8">
              <Link href={`/cellars/${row.id}`} className="font-display text-3xl text-seal">
                {cellarHeading(row.storm, guests.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="cellars-roll">
                {guests.map((guest) => (
                  <li key={guest.id} className="text-bark">{cellarGuestLine(guest.person)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{cellarsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={cellarsHeading(compiled.length)} path="/cellars" />
    </AppShell>
  );
}
