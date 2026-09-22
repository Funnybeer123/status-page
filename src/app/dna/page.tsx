import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function DnaPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.dnaNote.findMany({ where: { familyId: ctx.family.id }, include: { person: true }, orderBy: { haplogroup: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="dna-heading">DNA notes</h1>
      <p className="mt-3 max-w-2xl text-bark">A haplogroup or test company a relative recorded, kept with the family.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="dna"
          action="/api/later-records"
          testId="dna-form"
          submit="Add the DNA note"
          fields={[
            { name: "personId", people: options, label: "Whose test", required: true },
            { name: "haplogroup", placeholder: "O-M175" },
            { name: "company", placeholder: "23andMe" },
            { name: "notes", placeholder: "What the relative wrote down" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="dna-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.haplogroup || row.company || "DNA note"}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.company ? ` · ${row.company}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No DNA notes yet.</li> : null}
      </ul>
    </AppShell>
  );
}
