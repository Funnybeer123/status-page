import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLetterThread } from "@/lib/letterThread";
import { formatDate } from "@/lib/dates";

export default async function ReadingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { people: { include: { person: true } } },
    orderBy: { writtenAt: "asc" },
  });
  if (!letters.some((letter) => letter.id === id)) notFound();
  const thread = compileLetterThread(
    letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      transcript: letter.transcript,
      writtenAt: letter.writtenAt,
      replyToId: letter.replyToId,
      people: letter.people.map((item) => item.person.displayName),
    })),
    id,
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reading room</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reading-room-heading">The letter as a conversation</h1>
      <p className="mt-3 max-w-2xl text-bark">A thread shown back and forth, the way the family still reads it aloud.</p>
      <ol className="mt-10 space-y-4" data-testid="reading-room">
        {thread.map((turn) => (
          <li
            key={turn.id}
            className={`paper-card max-w-2xl p-5 ${turn.side === "right" ? "ml-auto" : ""}`}
            data-testid={`reading-turn-${turn.side}`}
          >
            <p className="font-display text-2xl">{turn.title}</p>
            <p className="font-sans text-sm text-gold">
              {formatDate(turn.writtenAt, "Undated")}
              {turn.people?.length ? ` · ${turn.people.join(", ")}` : ""}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-bark">{turn.transcript}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/letters/${id}`} className="text-seal">Open the letter</Link>
      </p>
    </AppShell>
  );
}
