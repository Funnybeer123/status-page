import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCrossword, emptyCrosswordHeading } from "@/lib/crossword";
import { isSecretLocked } from "@/lib/secretUntil";

export default async function EmptyCrosswordPage() {
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
      <h1 className="font-display text-4xl" data-testid="empty-crossword-heading">
        {clues.length ? "The crossword already has clues" : emptyCrosswordHeading()}
      </h1>
      <p className="mt-8 font-sans text-sm">
        <Link href="/crossword" className="text-seal">
          Family crossword
        </Link>
      </p>
    </AppShell>
  );
}
