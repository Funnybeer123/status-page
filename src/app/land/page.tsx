import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function LandPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.landRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { acquiredOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="land-heading">Land records</h1>
      <p className="mt-3 max-w-2xl text-bark">Farms, lots, and deeds the family still talks about.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="land"
          testId="land-form"
          submit="Add the land"
          fields={[
            { name: "personId", people: options, label: "Who held it", required: true },
            { name: "title", placeholder: "North farm", required: true },
            { name: "place", placeholder: "Cedar Falls, Iowa", required: true },
            { name: "acquiredOn", placeholder: "Acquired", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="land-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {" · "}{row.place}
              {row.acquiredOn ? ` · ${formatDate(row.acquiredOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No land records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
