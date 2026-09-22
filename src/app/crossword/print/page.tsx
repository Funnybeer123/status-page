import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCrossword, crosswordBlank, crosswordCiteLine, crosswordHeading, emptyCrosswordHeading } from "@/lib/crossword";
import { isSecretLocked } from "@/lib/secretUntil";

export default async function CrosswordPrintPage() {
  const ctx = await requireFamily();
  const [letters, stories] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const clues = compileCrossword([
    ...letters
      .filter((letter) => !isSecretLocked(letter.secretUntil))
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        kind: "letter",
        body: letter.transcript,
        href: `/letters/${letter.id}`,
      })),
    ...stories.map((story) => ({
      id: story.id,
      title: story.title,
      kind: "story",
      body: story.body,
      href: `/stories/${story.id}`,
    })),
  ]);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="crossword-print-heading">
        {clues.length ? crosswordHeading(clues.length) : emptyCrosswordHeading()}
      </h1>
      <p className="mt-3 text-bark">A printable sheet. Answers stay on the family crossword page.</p>
      <ol className="mt-10 space-y-4" data-testid="crossword-print">
        {clues.map((clue) => (
          <li key={clue.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{clue.number} across</p>
            <p className="mt-2 font-display text-2xl">{clue.clue}</p>
            <p className="mt-3 font-mono tracking-[0.5em] text-bark">{crosswordBlank(clue.answer)}</p>
            <p className="mt-2 font-sans text-sm text-gold">{crosswordCiteLine(clue.sourceTitle)}</p>
          </li>
        ))}
        {!clues.length ? <li className="text-bark">{emptyCrosswordHeading()}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/crossword" className="text-seal">
          See the answers
        </Link>
      </p>
    </AppShell>
  );
}
