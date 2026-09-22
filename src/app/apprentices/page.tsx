import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function ApprenticesPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.apprenticeship.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { startedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="apprentices-heading">Apprenticeships</h1>
      <p className="mt-3 max-w-2xl text-bark">The trade a relative learned, and who taught them.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="apprenticeship"
          action="/api/later-records"
          testId="apprentice-form"
          submit="Add the apprenticeship"
          fields={[
            { name: "personId", people: options, label: "Who learned", required: true },
            { name: "trade", placeholder: "Farming", required: true },
            { name: "master", placeholder: "Taught by" },
            { name: "place", placeholder: "North farm" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="apprentices-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.trade}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.master ? ` · with ${row.master}` : ""}
              {row.place ? ` · ${row.place}` : ""}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">No apprenticeships yet.</li> : null}
      </ul>
    </AppShell>
  );
}
