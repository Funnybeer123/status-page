import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { directoryLine } from "@/lib/cityDirectory";

export default async function CityDirectoryPage() {
  const ctx = await requireFamily();
  const [people, entries] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.cityDirectory.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="city-directory-heading">City directory</h1>
      <p className="mt-3 max-w-2xl text-bark">Name, occupation, address, and year — the way the town listed them.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="directory"
          action="/api/directory"
          testId="city-directory-form"
          submit="Add the line"
          fields={[
            { name: "name", placeholder: "Samuel Hart", required: true },
            { name: "occupation", placeholder: "farmer" },
            { name: "address", placeholder: "North farm, Cedar Falls", required: true },
            { name: "year", placeholder: "1950", type: "number", required: true },
            { name: "personId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "On the tree" },
            { name: "notes", placeholder: "What the book said" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="city-directory-list">
        {entries.map((entry) => (
          <li key={entry.id} className="paper-card p-5">
            <p className="font-display text-2xl">{entry.name}</p>
            <p className="text-bark">{directoryLine(entry)}</p>
            {entry.person ? (
              <p className="mt-2">
                <Link href={`/people/${entry.person.id}`} className="text-seal">{entry.person.displayName}</Link>
              </p>
            ) : null}
          </li>
        ))}
        {!entries.length ? <li className="text-bark">No directory lines yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/city-directory/missing" className="text-seal">Who is still missing a line</Link>
        {" · "}
        <Link href="/directory" className="text-seal">Family directory</Link>
      </p>
    </AppShell>
  );
}
