import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { journalLine, journalSharedHeading } from "@/lib/journal";

export default async function SharedJournalPage() {
  const ctx = await requireFamily();
  const entries = await prisma.journalEntry.findMany({
    where: { familyId: ctx.family.id, authorId: ctx.session.user.id, storyId: { not: null } },
    include: { story: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/journal" className="text-seal">Journal</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="journal-shared-heading">
        {journalSharedHeading(entries.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="journal-shared-list">
        {entries.map((entry) => (
          <li key={entry.id} className="paper-card p-5">
            <p className="font-display text-2xl">{entry.title}</p>
            <p className="text-bark">{journalLine(entry.title, true)}</p>
            {entry.storyId ? (
              <Link href={`/stories/${entry.storyId}`} className="font-sans text-sm text-seal">Open the story</Link>
            ) : null}
          </li>
        ))}
        {!entries.length ? <li className="text-bark">Nothing shared yet.</li> : null}
      </ul>
    </AppShell>
  );
}
