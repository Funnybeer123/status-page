import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function PetsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.familyPet.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { name: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pets-heading">Family pets</h1>
      <p className="mt-3 max-w-2xl text-bark">The animals who lived with the family, and the years they were there.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="pet"
          action="/api/later-records"
          testId="pet-form"
          submit="Add the pet"
          fields={[
            { name: "personId", people: options, label: "Who they belonged to" },
            { name: "name", placeholder: "Cider", required: true },
            { name: "petKind", placeholder: "Barn cat", required: true },
            { name: "startedOn", placeholder: "Arrived", type: "date" },
            { name: "endedOn", placeholder: "Until", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="pets-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.name}</p>
            <p className="text-bark">
              {row.kind}
              {row.person ? (
                <>
                  {" · "}
                  <Link href={`/people/${row.person.id}`} className="text-seal">{row.person.displayName}</Link>
                </>
              ) : null}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No pets recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
