import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { letterDuplicateHeading, suggestLetterDuplicates } from "@/lib/letterDuplicates";

export default async function LetterDuplicatesPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: [DocKind.letter, DocKind.note] }, deletedAt: null },
    include: { people: true },
  });
  const duplicates = suggestLetterDuplicates(
    letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      writtenAt: letter.writtenAt,
      transcript: letter.transcript,
      personIds: letter.people.map((row) => row.personId),
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="letter-duplicates-heading">
        {letterDuplicateHeading(duplicates.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The same people and date, or nearly the same wording — a second typing of a letter the family already kept.
      </p>
      <ul className="mt-10 space-y-3" data-testid="letter-duplicates-list">
        {duplicates.map((pair) => (
          <li key={`${pair.keepId}-${pair.dropId}`} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">
              {pair.reason} · {pair.score}
            </p>
            <p className="mt-2">
              <Link href={`/letters/${pair.keepId}`} className="font-display text-2xl text-seal">{pair.keepTitle}</Link>
            </p>
            <p className="mt-1">
              <Link href={`/letters/${pair.dropId}`} className="text-seal">{pair.dropTitle}</Link>
            </p>
          </li>
        ))}
        {!duplicates.length ? <li className="text-bark">No duplicate letters found.</li> : null}
      </ul>
    </AppShell>
  );
}
