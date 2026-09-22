import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { VoyageForm } from "@/app/voyages/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function VoyagesPage() {
  const ctx = await requireFamily();
  const [people, voyages] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.voyage.findMany({
      where: { familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
      orderBy: { departedOn: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="voyages-heading">Voyages</h1>
      <p className="mt-3 max-w-2xl text-bark">Ship, ports, date, and who was on the passenger list.</p>
      {canWrite(ctx.role) ? (
        <VoyageForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="voyages-list">
        {voyages.map((voyage) => (
          <li key={voyage.id} className="paper-card p-5">
            <p className="font-display text-2xl">{voyage.ship}</p>
            <p className="text-bark">
              {voyage.departedFrom} → {voyage.arrivedAt}
              {voyage.departedOn ? ` · ${formatDate(voyage.departedOn)}` : ""}
              {voyage.arrivedOn ? ` · arrived ${formatDate(voyage.arrivedOn)}` : ""}
            </p>
            <p className="mt-2 font-sans text-sm text-bark">
              {voyage.people.map((item) => (
                <span key={item.personId}>
                  <Link href={`/people/${item.personId}`} className="text-seal">{item.person.displayName}</Link>
                  {" "}
                </span>
              ))}
            </p>
            {voyage.notes ? <p className="mt-2 text-bark">{voyage.notes}</p> : null}
          </li>
        ))}
        {!voyages.length ? <li className="text-bark">No voyages yet.</li> : null}
      </ul>
    </AppShell>
  );
}
