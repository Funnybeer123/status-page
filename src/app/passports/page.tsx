import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function PassportsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.passportRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { issuedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="passports-heading">Passports</h1>
      <p className="mt-3 max-w-2xl text-bark">Issued papers that prove a crossing.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="passport"
          testId="passport-form"
          submit="Add the passport"
          fields={[
            { name: "personId", people: options, label: "Whose papers", required: true },
            { name: "numberNote", placeholder: "Number or note" },
            { name: "issuedOn", placeholder: "Issued", type: "date" },
            { name: "place", placeholder: "Issued at" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="passports-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
            </p>
            <p className="text-bark">
              {row.numberNote || "Passport"}
              {row.place ? ` · ${row.place}` : ""}
              {row.issuedOn ? ` · ${formatDate(row.issuedOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No passports yet.</li> : null}
      </ul>
    </AppShell>
  );
}
