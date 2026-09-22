import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function ClubsPage() {
  const ctx = await requireFamily();
  const [people, clubs] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.clubMembership.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { startedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="clubs-heading">Club memberships</h1>
      <p className="mt-3 max-w-2xl text-bark">Lodges, granges, and circles a relative belonged to.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="club"
          action="/api/clubs"
          testId="club-form"
          submit="Add the membership"
          fields={[
            { name: "personId", people: options, label: "Who belonged", required: true },
            { name: "club", placeholder: "Cedar Falls Grange", required: true },
            { name: "place", placeholder: "Cedar Falls" },
            { name: "startedOn", placeholder: "Joined", type: "date" },
            { name: "endedOn", placeholder: "Left", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="clubs-list">
        {clubs.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.club}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!clubs.length ? <li className="text-bark">No club memberships yet.</li> : null}
      </ul>
    </AppShell>
  );
}
