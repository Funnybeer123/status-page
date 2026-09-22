import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SourceForm } from "@/app/sources/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { shouldHideLivingFacts } from "@/lib/privacy";
import { qualityLabel } from "@/lib/sourceQuality";

export default async function SourcesPage() {
  const ctx = await requireFamily();
  const [people, documents, citations] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
    prisma.citation.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, document: true, event: true },
      orderBy: { claim: "asc" },
    }),
  ]);
  const visible = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="sources-heading">Sources</h1>
      <p className="mt-3 max-w-2xl text-bark">Claims a relative can prove, tied to a letter or a person.</p>
      {canWrite(ctx.role) ? (
        <SourceForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          documents={documents.map((document) => ({ id: document.id, title: document.title }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="sources-list">
        {visible.map((citation) => (
          <li key={citation.id} className="paper-card p-5">
            <p className="font-display text-2xl">{citation.claim}</p>
            <p className="text-bark">
              {citation.person ? (
                <Link href={`/people/${citation.person.id}`} className="text-seal">{citation.person.displayName}</Link>
              ) : (
                "Family claim"
              )}
              {citation.document ? (
                <>
                  {" — "}
                  <Link href={`/letters/${citation.document.id}`} className="text-seal">{citation.document.title}</Link>
                </>
              ) : null}
              {citation.pageNote ? ` (${citation.pageNote})` : ""}
              {citation.quality ? ` · ${qualityLabel(citation.quality)}` : ""}
            </p>
          </li>
        ))}
        {!visible.length ? <li className="text-bark">No sources yet.</li> : null}
      </ul>
    </AppShell>
  );
}
