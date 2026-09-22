import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function HolidaysPage() {
  const ctx = await requireFamily();
  const records = await prisma.familyHoliday.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="holidays-heading">Family holidays</h1>
      <p className="mt-3 max-w-2xl text-bark">The day the family still keeps, and what they cook.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="holiday"
          action="/api/later-records"
          testId="holiday-form"
          submit="Add the holiday"
          fields={[
            { name: "title", placeholder: "Harvest-dance anniversary supper", required: true },
            { name: "season", placeholder: "October" },
            { name: "notes", placeholder: "Sunday rolls and cider" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="holidays-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">{row.season}</p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No family holidays yet.</li> : null}
      </ul>
    </AppShell>
  );
}
