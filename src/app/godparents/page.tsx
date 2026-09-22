import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function GodparentsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.godparent.findMany({
      where: { familyId: ctx.family.id },
      include: { child: true, godparent: true },
    }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="godparents-heading">Godparents</h1>
      <p className="mt-3 max-w-2xl text-bark">Who stood for a child at the font.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="godparent"
          testId="godparent-form"
          submit="Record the godparent"
          fields={[
            { name: "childId", people: options, label: "Child", required: true },
            { name: "godparentId", people: options, label: "Godparent", required: true },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="godparents-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">
              <Link href={`/people/${row.godparentId}`} className="text-seal">{row.godparent.displayName}</Link>
              {" for "}
              <Link href={`/people/${row.childId}`} className="text-seal">{row.child.displayName}</Link>
            </p>
            {row.notes ? <p className="text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No godparents yet.</li> : null}
      </ul>
    </AppShell>
  );
}
