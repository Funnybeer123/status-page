import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function NaturalizationsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.naturalizationRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { happenedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="naturalizations-heading">Naturalization</h1>
      <p className="mt-3 max-w-2xl text-bark">The court that made a relative a citizen, and the date.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="naturalization"
          action="/api/later-records"
          testId="naturalization-form"
          submit="Add the naturalization"
          fields={[
            { name: "personId", people: options, label: "Who was naturalized", required: true },
            { name: "court", placeholder: "Northern District of Iowa", required: true },
            { name: "place", placeholder: "Iowa City" },
            { name: "happenedOn", placeholder: "Date", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="naturalizations-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.court}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.happenedOn ? ` · ${formatDate(row.happenedOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No naturalization records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
