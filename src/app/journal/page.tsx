import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { ShareJournal } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { journalHeading, journalLine } from "@/lib/journal";
import { KeepOutToggle } from "@/app/follow/ui";

export default async function JournalPage() {
  const ctx = await requireFamily();
  const entries = await prisma.journalEntry.findMany({
    where: { familyId: ctx.family.id, authorId: ctx.session.user.id },
    include: { story: true },
    orderBy: { createdAt: "desc" },
  });
  const shared = entries.filter((entry) => entry.storyId).length;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="journal-heading">
        {journalHeading(entries.length, shared)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Private until you share it as a story. Other relatives cannot read it before then.
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href="/journal/shared" className="text-seal">Entries already shared</Link>
      </p>
      <RecordForm
        kind="journal"
        action="/api/journal"
        testId="journal-form"
        submit="Keep this private"
        fields={[
          { name: "title", placeholder: "What I still remember", required: true },
          { name: "body", placeholder: "Write it the way you would tell a grandchild" },
          { name: "recordedAt", placeholder: "When", type: "date" },
        ]}
      />
      <ul className="mt-10 space-y-3" data-testid="journal-list">
        {entries.map((entry) => (
          <li key={entry.id} className="paper-card p-5">
            <p className="font-display text-2xl">{entry.title}</p>
            <p className="text-bark">{journalLine(entry.title, Boolean(entry.storyId))}</p>
            <p className="mt-2 whitespace-pre-wrap text-bark">{entry.body}</p>
            <KeepOutToggle kind="journal" id={entry.id} keepOut={entry.keepOutOfAsk} />
            {entry.storyId ? (
              <p className="mt-3 font-sans text-sm">
                <Link href={`/stories/${entry.storyId}`} className="text-seal">Open the story</Link>
              </p>
            ) : (
              <ShareJournal id={entry.id} />
            )}
          </li>
        ))}
        {!entries.length ? <li className="text-bark">No private journal yet.</li> : null}
      </ul>
    </AppShell>
  );
}
