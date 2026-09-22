import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function HandwritingPage() {
  const ctx = await requireFamily();
  const [people, letters, samples] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null }, orderBy: { title: "asc" } }),
    prisma.handwritingSample.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, document: true, asset: true },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="handwriting-heading">Handwriting</h1>
      <p className="mt-3 max-w-2xl text-bark">A sample of a relative’s hand, linked from a letter.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="handwriting"
          action="/api/handwriting"
          testId="handwriting-form"
          submit="Save the sample"
          fields={[
            { name: "personId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Whose hand", required: true },
            { name: "documentId", options: letters.map((letter) => ({ id: letter.id, label: letter.title })), label: "From this letter" },
            { name: "notes", placeholder: "What to notice" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="handwriting-list">
        {samples.map((sample) => (
          <li key={sample.id} className="paper-card p-5">
            <Link href={`/people/${sample.personId}`} className="font-display text-2xl text-seal">{sample.person.displayName}</Link>
            {sample.document ? (
              <p className="mt-2">
                <Link href={`/letters/${sample.document.id}`} className="text-seal">{sample.document.title}</Link>
              </p>
            ) : null}
            {sample.notes ? <p className="mt-2 text-bark">{sample.notes}</p> : null}
          </li>
        ))}
        {!samples.length ? <li className="text-bark">No handwriting samples yet.</li> : null}
      </ul>
    </AppShell>
  );
}
