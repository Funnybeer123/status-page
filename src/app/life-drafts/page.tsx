import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyLifeDraftsHeading, isEmptyDraft, lifeDraftHeading } from "@/lib/lifeDraft";

export default async function LifeDraftsPage() {
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
      <h1 className="mt-2 font-display text-4xl" data-testid="life-drafts-heading">
        {drafts.length ? `${drafts.length} life story drafts` : "No life story drafts yet"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Ask can fill a draft from the letters and stories already in the archive.</p>
      <ul className="mt-10 space-y-3" data-testid="life-drafts-list">
        {drafts.map((draft) => (
          <li key={draft.id} className="paper-card p-5">
            <Link href={`/life-drafts/${draft.personId}`} className="font-display text-2xl text-seal">
              {lifeDraftHeading(draft.person.displayName)}
            </Link>
            {isEmptyDraft(draft.body) ? <p className="text-gold">Still empty</p> : <p className="text-bark">{draft.body.slice(0, 160)}</p>}
          </li>
        ))}
        {!drafts.length ? <li className="text-bark">Open a person and start a life draft.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/life-drafts/empty" className="text-seal">{emptyLifeDraftsHeading(empty.length)}</Link>
      </p>
    </AppShell>
  );
}
