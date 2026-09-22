import Link from "next/link";
import { RelType } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { adoptionHeading, adoptionLine } from "@/lib/adoptionPaper";
import { formatDate } from "@/lib/dates";

export default async function AdoptionsPage() {
  const ctx = await requireFamily();
  const [papers, relationships, documents] = await Promise.all([
    prisma.adoptionPaper.findMany({
      where: { familyId: ctx.family.id },
      include: {
        document: true,
        relationship: { include: { fromPerson: true, toPerson: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.relationship.findMany({
      where: { familyId: ctx.family.id, type: RelType.adoptive },
      include: { fromPerson: true, toPerson: true },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="adoptions-heading">Adoption papers</h1>
      <p className="mt-3 max-w-2xl text-bark">A paper linked to the adoptive relationship it belongs to — not only a line on the tree.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="adoption"
          action="/api/adoptions"
          testId="adoption-form"
          submit="Link the paper"
          fields={[
            {
              name: "relationshipId",
              options: relationships.map((rel) => ({
                id: rel.id,
                label: `${rel.toPerson.displayName} adopted by ${rel.fromPerson.displayName}`,
              })),
              label: "Adoptive relationship",
            },
            {
              name: "documentId",
              options: documents.map((doc) => ({ id: doc.id, label: doc.title })),
              label: "The paper",
            },
            { name: "grantedOn", type: "date", placeholder: "Granted on" },
            { name: "notes", placeholder: "What the family still says" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="adoptions-list">
        {papers.map((paper) => (
          <li key={paper.id} className="paper-card p-5">
            <p className="font-display text-2xl">
              {adoptionHeading(paper.relationship.toPerson.displayName, paper.relationship.fromPerson.displayName)}
            </p>
            <p className="text-bark">
              {adoptionLine(
                paper.relationship.toPerson.displayName,
                paper.relationship.fromPerson.displayName,
                formatDate(paper.grantedOn, ""),
              )}
            </p>
            {paper.document ? (
              <p className="mt-2">
                <Link href={`/letters/${paper.document.id}`} className="text-seal">{paper.document.title}</Link>
              </p>
            ) : null}
            {paper.notes ? <p className="mt-2 text-bark">{paper.notes}</p> : null}
          </li>
        ))}
        {!papers.length ? <li className="text-bark">No adoption papers linked yet.</li> : null}
      </ul>
    </AppShell>
  );
}
