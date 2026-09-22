import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function CongregationsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.congregation.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { name: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="congregations-heading">Congregations</h1>
      <p className="mt-3 max-w-2xl text-bark">Churches and meeting houses a relative belonged to.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="congregation"
          testId="congregation-form"
          submit="Add the congregation"
          fields={[
            { name: "personId", people: options, label: "Who belonged", required: true },
            { name: "name", placeholder: "St. John's", required: true },
            { name: "place", placeholder: "Place" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="congregations-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.name}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">No congregations yet.</li> : null}
      </ul>
    </AppShell>
  );
}
