import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function WorksheetsPage() {
  const ctx = await requireFamily();
  const [people, letters, citations] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
    prisma.citation.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["census", "birth", "death"] } },
      include: { person: true, event: true },
      orderBy: { claim: "asc" },
    }),
  ]);
  const peopleOpts = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  const letterOpts = letters.map((letter) => ({ id: letter.id, label: letter.title }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="worksheets-heading">Citation worksheets</h1>
      <p className="mt-3 max-w-2xl text-bark">A census, a birth, and a death — each claim cites a page the family can find again.</p>
      {canWrite(ctx.role) ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <RecordForm
            kind="census"
            action="/api/worksheets"
            testId="census-worksheet"
            submit="Cite the census"
            fields={[
              { name: "personId", people: peopleOpts, label: "Who was counted", required: true },
              { name: "year", placeholder: "1950" },
              { name: "place", placeholder: "Cedar Falls" },
              { name: "detail", placeholder: "ED 7-12, sheet 4" },
              { name: "documentId", options: letterOpts, label: "Source" },
            ]}
          />
          <RecordForm
            kind="birth"
            action="/api/worksheets"
            testId="birth-worksheet"
            submit="Cite the birth"
            fields={[
              { name: "personId", people: peopleOpts, label: "Whose birth", required: true },
              { name: "year", placeholder: "1929-03-08" },
              { name: "place", placeholder: "Cedar Falls" },
              { name: "detail", placeholder: "County register, p. 12" },
              { name: "documentId", options: letterOpts, label: "Source" },
            ]}
          />
          <RecordForm
            kind="death"
            action="/api/worksheets"
            testId="death-worksheet"
            submit="Cite the death"
            fields={[
              { name: "personId", people: peopleOpts, label: "Whose death", required: true },
              { name: "year", placeholder: "2008-11-02" },
              { name: "place", placeholder: "Cedar Falls" },
              { name: "detail", placeholder: "Certificate 441" },
              { name: "documentId", options: letterOpts, label: "Source" },
            ]}
          />
        </div>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="worksheets-list">
        {citations.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{row.kind}</p>
            {row.person ? (
              <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            ) : null}
            <p className="mt-2 text-bark">{row.claim}</p>
            {row.pageNote ? <p className="font-sans text-sm text-gold">{row.pageNote}</p> : null}
          </li>
        ))}
        {!citations.length ? <li className="text-bark">No worksheets yet.</li> : null}
      </ul>
    </AppShell>
  );
}
