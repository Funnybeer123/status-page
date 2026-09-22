import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { clueAnswerHref, clueCitationLine, huntHeading } from "@/lib/hunt";
import { HuntClueForm } from "@/app/hunt/ui";
import { huntBadgeLine, huntFinishersHeading } from "@/lib/huntBadge";
import { HuntFinishButton } from "@/app/funeral/ui";

export default async function HuntPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [hunt, letters, photos, places] = await Promise.all([
    prisma.hunt.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        clues: { include: { document: true, asset: true, place: true }, orderBy: { sortOrder: "asc" } },
        finishes: { include: { user: { select: { name: true } } }, orderBy: { finishedAt: "asc" } },
      },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.place.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!hunt) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Scavenger hunt</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="hunt-heading">{huntHeading(hunt.title, hunt.clues.length)}</h1>
      {hunt.notes ? <p className="mt-3 max-w-2xl text-bark">{hunt.notes}</p> : null}
      {canWrite(ctx.role) ? (
        <HuntClueForm huntId={hunt.id} letters={letters} photos={photos} places={places} />
      ) : null}
      <ol className="mt-10 space-y-4" data-testid="hunt-clues">
        {hunt.clues.map((clue) => (
          <li key={clue.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">{clue.targetKind}</p>
            <p className="font-display text-2xl">{clue.clue}</p>
            <p className="mt-2 text-bark">Answer: {clue.answer}</p>
            <p className="mt-1 font-sans text-sm text-gold" data-testid={`hunt-citation-${clue.id}`}>
              {clueCitationLine({
                clue: clue.clue,
                targetKind: clue.targetKind,
                answer: clue.answer,
                citation: clue.citation,
                documentTitle: clue.document?.title,
                assetTitle: clue.asset?.title,
                placeName: clue.place?.name,
              })}
            </p>
            <Link href={clueAnswerHref(clue)} className="mt-2 inline-block text-seal">
              Open the archive
            </Link>
          </li>
        ))}
        {!hunt.clues.length ? <li className="text-bark">Add a clue that points to a letter, a photograph, or a place.</li> : null}
      </ol>
      <HuntFinishButton huntId={hunt.id} />
      <section className="mt-8" data-testid="hunt-finishers">
        <h2 className="font-display text-2xl">{huntFinishersHeading(hunt.finishes.length)}</h2>
        <ul className="mt-3 space-y-2">
          {hunt.finishes.map((row) => (
            <li key={`${row.huntId}-${row.userId}`} className="text-bark">
              {huntBadgeLine(row.user.name || "A relative", hunt.title)}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href="/hunts" className="text-seal">All hunts</Link>
        {" · "}
        <Link href="/hunts/badges" className="text-seal">Badges</Link>
      </p>
    </AppShell>
  );
}
