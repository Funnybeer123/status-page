import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function InscriptionsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.gravestoneInscription.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="inscriptions-heading">Gravestone inscriptions</h1>
      <p className="mt-3 max-w-2xl text-bark">
        The words on the stone, kept with the person.{" "}
        <Link href="/carvers" className="text-seal">Who carved the stone</Link>
      </p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="inscription"
          action="/api/later-records"
          testId="inscription-form"
          submit="Save the inscription"
          fields={[
            { name: "personId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Whose stone", required: true },
            { name: "text", placeholder: "At rest under the cottonwoods", required: true },
            { name: "place", placeholder: "Fairview Cemetery" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="inscriptions-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            <p className="mt-2 whitespace-pre-wrap text-bark">{row.text}</p>
            {row.place ? <p className="font-sans text-sm text-gold">{row.place}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No inscriptions yet.</li> : null}
      </ul>
    </AppShell>
  );
}
