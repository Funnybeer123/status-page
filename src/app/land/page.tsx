import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function LandPage() {
  const ctx = await requireFamily();
  const [people, records, homes] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.landRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true, home: true }, orderBy: { acquiredOn: "asc" } }),
    prisma.familyHome.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
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
            { name: "abstract", placeholder: "Deed abstract" },
            { name: "homeId", label: "Tied to a home", options: homes.map((home) => ({ id: home.id, label: home.title })) },
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
              {row.home ? (
                <>
                  {" · "}
                  <Link href={`/homes/${row.home.id}`} className="text-seal">{row.home.title}</Link>
                </>
              ) : null}
              {row.acquiredOn ? ` · ${formatDate(row.acquiredOn)}` : ""}
            </p>
            {row.abstract ? <p className="mt-2 text-bark" data-testid="land-abstract">{row.abstract}</p> : null}
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No land records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
