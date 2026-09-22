import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function AddressesPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.familyAddress.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { label: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="addresses-heading">Street addresses</h1>
      <p className="mt-3 max-w-2xl text-bark">The house number a relative would write on an envelope.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="address"
          action="/api/later-records"
          testId="address-form"
          submit="Add the address"
          fields={[
            { name: "personId", people: options, label: "Who lived there" },
            { name: "label", placeholder: "Whitaker house", required: true },
            { name: "line", placeholder: "14 Market Street", required: true },
            { name: "locality", placeholder: "Cedar Falls" },
            { name: "region", placeholder: "Iowa" },
            { name: "country", placeholder: "United States" },
            { name: "startedOn", placeholder: "From", type: "date" },
            { name: "endedOn", placeholder: "Until", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="addresses-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.label}</p>
            <p className="text-bark">
              {row.line}
              {row.locality ? `, ${row.locality}` : ""}
              {row.region ? `, ${row.region}` : ""}
              {row.country ? `, ${row.country}` : ""}
            </p>
            <p className="mt-1 text-bark">
              {row.person ? <Link href={`/people/${row.person.id}`} className="text-seal">{row.person.displayName}</Link> : "Family house"}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">No street addresses yet.</li> : null}
      </ul>
    </AppShell>
  );
}
