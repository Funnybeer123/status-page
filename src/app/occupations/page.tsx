import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function OccupationsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.occupationRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { startedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="occupations-heading">Occupations</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Work a relative did, with the employer and years if we know them.{" "}
        <Link href="/occupations/timelines" className="text-seal">Occupation timelines</Link>
        {" · "}
        <Link href="/occupations/missing" className="text-seal">Still needed</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="occupation"
          testId="occupation-form"
          submit="Add the occupation"
          fields={[
            { name: "personId", people: options, label: "Who worked", required: true },
            { name: "title", placeholder: "Beekeeper", required: true },
            { name: "employer", placeholder: "Employer" },
            { name: "place", placeholder: "Place" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="occupations-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}/occupations`} className="text-seal">{row.person.displayName}</Link>
              {row.employer ? ` · ${row.employer}` : ""}
              {row.place ? ` · ${row.place}` : ""}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">No occupations yet.</li> : null}
      </ul>
    </AppShell>
  );
}
