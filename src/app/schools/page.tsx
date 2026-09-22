import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SchoolForm } from "@/app/schools/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatYear } from "@/lib/dates";

export default async function SchoolsPage() {
  const ctx = await requireFamily();
  const [people, schools] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.schooling.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { startedOn: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="schools-heading">Schools</h1>
      <p className="mt-3 max-w-2xl text-bark">Schools attended, with years and place.</p>
      {canWrite(ctx.role) ? (
        <SchoolForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="schools-list">
        {schools.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.school}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : ""}
              {row.startedOn || row.endedOn
                ? ` · ${formatYear(row.startedOn) || "?"}–${formatYear(row.endedOn) || ""}`
                : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!schools.length ? <li className="text-bark">No schools yet.</li> : null}
      </ul>
    </AppShell>
  );
}
