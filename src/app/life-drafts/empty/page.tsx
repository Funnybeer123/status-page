import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyLifeDraftsHeading, isEmptyDraft, lifeDraftHeading } from "@/lib/lifeDraft";

export default async function EmptyLifeDraftsPage() {
  const ctx = await requireFamily();
  const drafts = await prisma.lifeDraft.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { updatedAt: "desc" },
  });
  const empty = drafts.filter((draft) => isEmptyDraft(draft.body));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="empty-life-drafts-heading">{emptyLifeDraftsHeading(empty.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="empty-life-drafts">
        {empty.map((draft) => (
          <li key={draft.id} className="paper-card p-5">
            <Link href={`/life-drafts/${draft.personId}`} className="font-display text-2xl text-seal">
              {lifeDraftHeading(draft.person.displayName)}
            </Link>
          </li>
        ))}
        {!empty.length ? <li className="text-bark">Every life draft already has words from the archive.</li> : null}
      </ul>
    </AppShell>
  );
}
