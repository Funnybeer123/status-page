import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function BiblesPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.bibleRecord.findMany({ where: { familyId: ctx.family.id }, include: { holder: true }, orderBy: { title: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bibles-heading">Family Bibles</h1>
      <p className="mt-3 max-w-2xl text-bark">What was written in the flyleaf.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="bible"
          testId="bible-form"
          submit="Save the Bible note"
          fields={[
            { name: "title", placeholder: "Hart family Bible", required: true },
            { name: "holderId", people: options, label: "Who keeps it" },
            { name: "body", placeholder: "What the flyleaf says", required: true },
            { name: "recordedAt", placeholder: "Dated", type: "date" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="bibles-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              {row.holder ? row.holder.displayName : "Family Bible"}
              {row.recordedAt ? ` · ${formatDate(row.recordedAt)}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-bark">{row.body}</p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">No Bible records yet.</li> : null}
      </ul>
    </AppShell>
  );
}
