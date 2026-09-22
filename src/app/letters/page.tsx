import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { letterIndexLine, lettersIndexHeading, sortLettersByDate, undatedLettersHeading } from "@/lib/lettersIndex";

export default async function LettersIndexPage() {
  const ctx = await requireFamily();
  const letters = sortLettersByDate(
    await prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: { in: [DocKind.letter, DocKind.note] }, deletedAt: null },
      include: { people: { include: { person: true } } },
    }),
  );
  const undated = letters.filter((letter) => !letter.writtenAt);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="letters-index-heading">
        {lettersIndexHeading(letters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every letter in the family, oldest first.{" "}
        <Link href="/letters/new" className="text-seal">Write a letter</Link>
        {" · "}
        <Link href="/letters/undated" className="text-seal">{undatedLettersHeading(undated.length)}</Link>
        {" · "}
        <Link href="/letters/pair/people" className="text-seal">Two letters side by side</Link>.
      </p>
      <ol className="mt-10 space-y-3" data-testid="letters-index">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="text-bark">
              {letterIndexLine(letter.title, formatDate(letter.writtenAt, ""))}
              {letter.people.length ? ` · ${letter.people.map((item) => item.person.displayName).join(", ")}` : ""}
            </p>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">No letters yet.</li> : null}
      </ol>
    </AppShell>
  );
}
