import Link from "next/link";
import { notFound } from "next/navigation";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { letterPairHeading, letterPairSideLabel, sortLettersForPair } from "@/lib/letterPair";

export default async function LetterPairPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string; a?: string; b?: string }>;
}) {
  const ctx = await requireFamily();
  const { personId, a, b } = await searchParams;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.letter, deletedAt: null },
    include: { people: { include: { person: true } } },
  });
  const person = personId
    ? await prisma.person.findFirst({ where: { id: personId, familyId: ctx.family.id, deletedAt: null } })
    : null;
  const scoped = person
    ? letters.filter((letter) => letter.people.some((row) => row.personId === person.id))
    : letters.filter((letter) => letter.id === a || letter.id === b);
  const sorted = sortLettersForPair(scoped);
  const left = a ? sorted.find((letter) => letter.id === a) ?? sorted[0] : sorted[0];
  const right = b ? sorted.find((letter) => letter.id === b) ?? sorted[1] : sorted.find((letter) => letter.id !== left?.id);
  if (!left || !right) notFound();
  const name = person?.displayName || left.people[0]?.person.displayName || "the same person";
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Side by side</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="letter-pair-heading">{letterPairHeading(name)}</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <article className="paper-card p-5" data-testid="letter-pair-left">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">{letterPairSideLabel(left.title, formatDate(left.writtenAt, ""))}</p>
          <Link href={`/letters/${left.id}`} className="mt-2 block font-display text-2xl text-seal">{left.title}</Link>
          <p className="mt-4 whitespace-pre-wrap text-bark">{left.transcript}</p>
        </article>
        <article className="paper-card p-5" data-testid="letter-pair-right">
          <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">{letterPairSideLabel(right.title, formatDate(right.writtenAt, ""))}</p>
          <Link href={`/letters/${right.id}`} className="mt-2 block font-display text-2xl text-seal">{right.title}</Link>
          <p className="mt-4 whitespace-pre-wrap text-bark">{right.transcript}</p>
        </article>
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href="/letters/pair/people" className="text-seal">People with two letters</Link>
        {" · "}
        <Link href="/letters" className="text-seal">All letters</Link>
      </p>
    </AppShell>
  );
}
