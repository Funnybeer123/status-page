import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCrossword, crosswordCiteLine, crosswordHeading, emptyCrosswordHeading } from "@/lib/crossword";
import { isSecretLocked } from "@/lib/secretUntil";

export default async function CrosswordPage() {
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
  const heading = clues.length ? crosswordHeading(clues.length) : emptyCrosswordHeading();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="crossword-heading">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Clues drawn from letters and stories. Each answer cites the page it came from.{" "}
        <Link href="/quiz" className="text-seal">
          Family quiz
        </Link>
        {" · "}
        <Link href="/crossword/print" className="text-seal">
          Print the crossword
        </Link>
        {" · "}
        <Link href="/crossword/empty" className="text-seal">
          Empty crossword
        </Link>
      </p>
      <ol className="mt-10 space-y-4" data-testid="crossword-list">
        {clues.map((clue) => (
          <li key={clue.id} className="paper-card p-5" data-testid="crossword-clue">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">
              {clue.number} across · {clue.answer.length} letters
            </p>
            <p className="mt-2 font-display text-2xl">{clue.clue}</p>
            <p className="mt-2 font-mono tracking-[0.4em] text-seal" data-testid="crossword-answer">
              {clue.answer}
            </p>
            <p className="mt-2 font-sans text-sm">
              <Link href={clue.href} className="text-seal">
                {crosswordCiteLine(clue.sourceTitle)}
              </Link>
            </p>
          </li>
        ))}
        {!clues.length ? <li className="text-bark">{emptyCrosswordHeading()}</li> : null}
      </ol>
      <CiteBlock title={heading} path="/crossword" />
    </AppShell>
  );
}
