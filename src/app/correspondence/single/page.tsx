import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLetterThread, singleLetterThreadHeading } from "@/lib/letterThread";

export default async function SingleLetterThreadsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
  });
  const roots = new Map<string, typeof letters>();
  for (const letter of letters) {
    const thread = compileLetterThread(
      letters.map((item) => ({
        id: item.id,
        title: item.title,
        transcript: item.transcript,
        writtenAt: item.writtenAt,
        replyToId: item.replyToId,
      })),
      letter.id,
    );
    const rootId = thread[0]?.rootId || letter.id;
    if (!roots.has(rootId)) roots.set(rootId, []);
  }
  const singles = [...roots.keys()]
    .map((rootId) => {
      const thread = compileLetterThread(
        letters.map((item) => ({
          id: item.id,
          title: item.title,
          transcript: item.transcript,
          writtenAt: item.writtenAt,
          replyToId: item.replyToId,
        })),
        rootId,
      );
      return thread.length === 1 ? thread[0] : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="single-thread-heading">
        {singleLetterThreadHeading(singles.length)}
      </h1>
      <p className="mt-3 text-bark">
        Threads that still only have a first letter.{" "}
        <Link href="/correspondence" className="text-seal">Correspondence</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="single-thread-list">
        {singles.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/room`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
          </li>
        ))}
        {!singles.length ? <li className="text-bark">{singleLetterThreadHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
