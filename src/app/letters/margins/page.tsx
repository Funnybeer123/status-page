import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { letterMarginsHeading, marginNoteLine } from "@/lib/marginNotes";

export default async function MarginsIndexPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, marginNotes: { some: {} } },
    include: { marginNotes: { include: { author: { select: { name: true } } } } },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="letter-margins-heading">
        {letterMarginsHeading(letters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        <Link href="/letters/margins/missing" className="text-seal">Letters without a margin note</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="letter-margins-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/margins`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
            {letter.marginNotes.map((note) => (
              <p key={note.id} className="text-bark">
                {marginNoteLine(note.line, note.author.name, note.body)}
              </p>
            ))}
          </li>
        ))}
        {!letters.length ? <li className="text-bark">{letterMarginsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
