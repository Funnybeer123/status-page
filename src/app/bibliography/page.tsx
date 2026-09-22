import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shouldHideLivingFacts } from "@/lib/privacy";

export default async function BibliographyPage() {
  const ctx = await requireFamily();
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, document: true, event: true, asset: true },
    orderBy: { claim: "asc" },
  });
  const visible = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  const documents = [...new Map(visible.filter((item) => item.document).map((item) => [item.document!.id, item.document!])).values()]
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
          <h1 className="mt-2 font-display text-4xl" data-testid="bibliography-heading">Source bibliography</h1>
          <p className="mt-3 max-w-2xl text-bark">Every cited letter and claim, ready to print.</p>
        </div>
        <button type="button" className="print:hidden rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream" data-testid="bibliography-print">
          Print
        </button>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[data-testid=bibliography-print]')?.addEventListener('click',()=>window.print())`,
        }}
      />
      <section className="mt-10">
        <h2 className="font-display text-3xl">Works cited</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6" data-testid="bibliography-works">
          {documents.map((document) => (
            <li key={document.id}>
              <Link href={`/letters/${document.id}`} className="text-seal">{document.title}</Link>
              {document.writtenAt ? ` (${document.writtenAt.toISOString().slice(0, 4)})` : ""}
            </li>
          ))}
          {!documents.length ? <li className="list-none text-bark">No cited works yet.</li> : null}
        </ol>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">Claims</h2>
        <ul className="mt-4 space-y-3" data-testid="bibliography-claims">
          {visible.map((citation) => (
            <li key={citation.id} className="paper-card p-5">
              <p className="font-display text-2xl">{citation.claim}</p>
              <p className="text-bark">
                {citation.person ? citation.person.displayName : "Family claim"}
                {citation.document ? ` — ${citation.document.title}` : ""}
                {citation.pageNote ? ` (${citation.pageNote})` : ""}
              </p>
            </li>
          ))}
          {!visible.length ? <li className="text-bark">No sources yet.</li> : null}
        </ul>
      </section>
    </AppShell>
  );
}
