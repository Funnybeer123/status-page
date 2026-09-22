import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function BusinessesPage() {
  const ctx = await requireFamily();
  const [people, businesses] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.familyBusiness.findMany({
      where: { familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
      orderBy: { startedOn: "asc" },
    }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="businesses-heading">Family businesses</h1>
      <p className="mt-3 max-w-2xl text-bark">The shop or farm a relative ran, with the years and the place.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="business"
          action="/api/businesses"
          testId="business-form"
          submit="Add the business"
          fields={[
            { name: "name", placeholder: "North farm honey", required: true },
            { name: "place", placeholder: "Cedar Falls, Iowa" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
            { name: "notes", placeholder: "What they sold" },
            { name: "personIds", people: options, label: "Who worked it" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="businesses-list">
        {businesses.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.name}</p>
            <p className="text-bark">
              {row.place || "Place unknown"}
              {row.startedOn || row.endedOn ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}` : ""}
            </p>
            <p className="mt-2 text-bark">
              {row.people.map((link, index) => (
                <span key={link.personId}>
                  {index ? ", " : ""}
                  <Link href={`/people/${link.personId}`} className="text-seal">{link.person.displayName}</Link>
                </span>
              ))}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!businesses.length ? <li className="text-bark">No family businesses yet.</li> : null}
      </ul>
    </AppShell>
  );
}
