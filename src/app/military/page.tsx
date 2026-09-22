import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function MilitaryPage() {
  const ctx = await requireFamily();
  const [people, records, units] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.militaryService.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, militaryUnit: true },
      orderBy: { startedOn: "asc" },
    }),
    prisma.militaryUnit.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="military-heading">Military service</h1>
      <p className="mt-3 max-w-2xl text-bark">Branch, unit, rank, and the years they served.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="military"
          testId="military-form"
          submit="Add the service"
          fields={[
            { name: "personId", people: options, label: "Who served", required: true },
            { name: "branch", placeholder: "Army", required: true },
            { name: "unit", placeholder: "Unit" },
            { name: "unitName", placeholder: "Or name a new unit" },
            { name: "unitId", label: "Existing unit", options: units.map((unit) => ({ id: unit.id, label: unit.name })) },
            { name: "rank", placeholder: "Rank" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="military-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.branch}{row.rank ? ` · ${row.rank}` : ""}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.militaryUnit ? (
                <>
                  {" · "}
                  <Link href={`/military/units/${row.militaryUnit.id}`} className="text-seal">{row.militaryUnit.name}</Link>
                </>
              ) : row.unit ? ` · ${row.unit}` : ""}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No service recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
