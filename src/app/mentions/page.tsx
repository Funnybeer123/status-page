import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function MentionsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.newspaperMention.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { publishedOn: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="mentions-heading">Newspaper mentions</h1>
      <p className="mt-3 max-w-2xl text-bark">A name in the local paper, even when we do not have the clipping.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="mention"
          action="/api/later-records"
          testId="mention-form"
          submit="Add the mention"
          fields={[
            { name: "personId", people: options, label: "Who was named", required: true },
            { name: "headline", placeholder: "Hart and Whitaker at the harvest dance", required: true },
            { name: "paper", placeholder: "Cedar Falls Record" },
            { name: "publishedOn", placeholder: "Published", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="mentions-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.headline}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.paper ? ` · ${row.paper}` : ""}
              {row.publishedOn ? ` · ${formatDate(row.publishedOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No newspaper mentions yet.</li> : null}
      </ul>
    </AppShell>
  );
}
