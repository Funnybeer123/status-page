import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { classHeading, classLine } from "@/lib/cityDirectory";

export default async function ClassesPage() {
  const ctx = await requireFamily();
  const [people, classes] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.schoolClass.findMany({
      where: { familyId: ctx.family.id },
      include: { pupils: { include: { person: true } } },
      orderBy: [{ year: "desc" }, { school: "asc" }],
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="classes-heading">School class lists</h1>
      <p className="mt-3 max-w-2xl text-bark">A class, the school, the year, and the pupils who sat together.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="class"
          action="/api/classes"
          testId="class-form"
          submit="Save the class"
          fields={[
            { name: "school", placeholder: "Cedar Falls High", required: true },
            { name: "year", placeholder: "1946", type: "number", required: true },
            { name: "place", placeholder: "Cedar Falls, Iowa" },
            { name: "personIds", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Pupils" },
            { name: "notes", placeholder: "What the class still remembers" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="classes-list">
        {classes.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/classes/${row.id}`} className="font-display text-2xl text-seal">{classHeading(row.school, row.year)}</Link>
            <p className="text-bark">{classLine(row.pupils.map((pupil) => pupil.person.displayName))}</p>
            {row.place ? <p className="font-sans text-sm text-gold">{row.place}</p> : null}
          </li>
        ))}
        {!classes.length ? <li className="text-bark">No class lists yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/classes/mates" className="text-seal">Classmates</Link>
        {" · "}
        <Link href="/schools" className="text-seal">Schools</Link>
      </p>
    </AppShell>
  );
}
