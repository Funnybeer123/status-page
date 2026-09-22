import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileUncited } from "@/lib/uncited";
import { suggestDuplicates } from "@/lib/duplicates";
import { unlocatedTags } from "@/lib/whoWhere";
import { compileReviewInbox, inboxHeading, inboxKindLabel } from "@/lib/reviewInbox";
import { alive } from "@/lib/alive";

export default async function InboxPage() {
  const ctx = await requireFamily();
  const familyId = ctx.family.id;
  const [ocr, people, citations, census, tags] = await Promise.all([
    prisma.document.findMany({
      where: { familyId, deletedAt: null, needsReview: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.person.findMany({
      where: { familyId, ...alive },
      select: { id: true, displayName: true, givenName: true, familyName: true, birthDate: true, deathDate: true },
    }),
    prisma.citation.findMany({ where: { familyId }, select: { personId: true, kind: true } }),
    prisma.lifeEvent.findMany({ where: { familyId, kind: "census" }, select: { personId: true } }),
    prisma.personTag.findMany({
      where: { asset: { familyId, deletedAt: null } },
      include: { person: true, asset: true },
    }),
  ]);
  const items = compileReviewInbox({
    ocr,
    uncited: compileUncited({
      people,
      citations,
      censusPersonIds: census.map((row) => row.personId),
    }),
    unlocated: unlocatedTags(
      tags.map((tag) => ({
        id: tag.id,
        personId: tag.personId,
        name: tag.person.displayName,
        x: tag.x,
        y: tag.y,
        assetTitle: tag.asset.title,
        assetId: tag.assetId,
      })),
    ),
    duplicates: suggestDuplicates(people),
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="inbox-heading">{inboxHeading(items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">OCR to check, uncited facts, unlocated faces, and suggested duplicates in one list.</p>
      <ul className="mt-10 space-y-3" data-testid="inbox-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5" data-testid={`inbox-${item.kind}`}>
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{inboxKindLabel(item.kind)}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="mt-1 text-bark">{item.reason}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">The archive is caught up.</li> : null}
      </ul>
    </AppShell>
  );
}
