import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ProbatePage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.probateRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { happenedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="probate-heading">Probate</h1>
      <p className="mt-3 max-w-2xl text-bark">When an estate entered court, and where.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="probate"
          action="/api/later-records"
          testId="probate-form"
          submit="Add the probate"
          fields={[
            { name: "personId", people: options, label: "Whose estate", required: true },
            { name: "title", placeholder: "Samuel Hart’s estate", required: true },
            { name: "happenedOn", placeholder: "Entered probate", type: "date" },
            { name: "place", placeholder: "Cedar Falls" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="probate-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.happenedOn ? ` · ${formatDate(row.happenedOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No probate records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
