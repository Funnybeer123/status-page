import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MarginNoteForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMarginNotes, letterLines, marginNoteLine, marginsHeading } from "@/lib/marginNotes";

export default async function LetterMarginsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { marginNotes: { include: { author: { select: { name: true } } } } },
  });
  if (!letter) notFound();
  const lines = letterLines(letter.transcript);
  const notes = compileMarginNotes(
    letter.marginNotes.map((note) => ({
      id: note.id,
      line: note.line,
      body: note.body,
      author: note.author.name,
    })),
  );
  const byLine = new Map<number, typeof notes>();
  for (const note of notes) {
    const list = byLine.get(note.line) || [];
    list.push(note);
    byLine.set(note.line, list);
  }
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="margins-heading">
        {marginsHeading(letter.title, notes.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Short comments pinned to a line, with who wrote the note.{" "}
        <Link href={`/letters/${letter.id}`} className="text-seal">{letter.title}</Link>
        {" · "}
        <Link href="/letters/margins" className="text-seal">All margin notes</Link>
      </p>
      {canWrite(ctx.role) ? <MarginNoteForm letterId={letter.id} /> : null}
      <ol className="mt-10 space-y-3" data-testid="margin-script">
        {lines.map((text, index) => {
          const number = index + 1;
          const pinned = byLine.get(number) || [];
          return (
            <li key={number} className="paper-card p-5" data-line={number}>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Line {number}</p>
              <p className="mt-1 whitespace-pre-wrap text-lg">{text || " "}</p>
              {pinned.map((note) => (
                <p key={note.id} className="mt-2 text-bark" data-testid="margin-note">
                  {marginNoteLine(note.line, note.author, note.body)}
                </p>
              ))}
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
