import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { paperHeading, paperLine } from "@/lib/cityDirectory";

export default async function MilitaryPapersPage() {
  const ctx = await requireFamily();
  const [people, services, documents, papers] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.militaryService.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
    prisma.militaryPaper.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, service: true, document: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="military-papers-heading">Draft and pension papers</h1>
      <p className="mt-3 max-w-2xl text-bark">A draft card or a pension record, linked to the service it belongs to.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="military-paper"
          action="/api/military/papers"
          testId="military-paper-form"
          submit="Save the paper"
          fields={[
            { name: "personId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Who served", required: true },
            { name: "kind", placeholder: "draft or pension", required: true },
            { name: "year", placeholder: "1944", type: "number" },
            { name: "numberNote", placeholder: "Card or claim number" },
            {
              name: "serviceId",
              options: services.map((row) => ({ id: row.id, label: `${row.person.displayName} · ${row.branch}` })),
              label: "Service record",
            },
            {
              name: "documentId",
              options: documents.map((doc) => ({ id: doc.id, label: doc.title })),
              label: "Linked paper",
            },
            { name: "notes", placeholder: "What the family still says" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="military-papers-list">
        {papers.map((paper) => (
          <li key={paper.id} className="paper-card p-5">
            <p className="font-display text-2xl">{paperHeading(paper.kind, paper.person.displayName)}</p>
            <p className="text-bark">{paperLine(paper.kind, paper.person.displayName, paper.year)}</p>
            {paper.service ? <p className="font-sans text-sm text-gold">{paper.service.branch}</p> : null}
            {paper.document ? (
              <p className="mt-2">
                <Link href={`/letters/${paper.document.id}`} className="text-seal">{paper.document.title}</Link>
              </p>
            ) : null}
          </li>
        ))}
        {!papers.length ? <li className="text-bark">No draft or pension papers yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/military" className="text-seal">Military service</Link>
        {" · "}
        <Link href="/military/papers/needed" className="text-seal">Still missing a paper</Link>
      </p>
    </AppShell>
  );
}
