import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function AwardsPage() {
  const ctx = await requireFamily();
  const [people, awards] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.awardRecord.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { awardedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="awards-heading">Awards</h1>
      <p className="mt-3 max-w-2xl text-bark">Ribbons, medals, and prizes a relative brought home.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="award"
          action="/api/awards"
          testId="award-form"
          submit="Add the award"
          fields={[
            { name: "personId", people: options, label: "Who received it", required: true },
            { name: "title", placeholder: "County fair pie ribbon", required: true },
            { name: "awardedOn", placeholder: "Awarded", type: "date" },
            { name: "place", placeholder: "Cedar Falls" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="awards-list">
        {awards.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.awardedOn ? ` · ${formatDate(row.awardedOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!awards.length ? <li className="text-bark">No awards yet.</li> : null}
      </ul>
    </AppShell>
  );
}
