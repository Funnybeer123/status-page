import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { ShareJournal } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { journalHeading, journalLine } from "@/lib/journal";
import { KeepOutToggle } from "@/app/follow/ui";
import { SecretUntilForm } from "@/app/memory-lane/ui";
import { hiddenSecretBody, isSecretLocked, secretUntilLine } from "@/lib/secretUntil";
import { canWrite } from "@/lib/roles";

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
            {entry.secretUntil ? (
              <p className="mt-1 font-sans text-sm text-gold" data-testid="journal-secret-until">
                {secretUntilLine(entry.secretUntil)}
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-bark">
              {isSecretLocked(entry.secretUntil) ? hiddenSecretBody() : entry.body}
            </p>
            <KeepOutToggle kind="journal" id={entry.id} keepOut={entry.keepOutOfAsk} />
            {canWrite(ctx.role) ? (
              <SecretUntilForm
                journalId={entry.id}
                until={entry.secretUntil ? entry.secretUntil.toISOString().slice(0, 10) : ""}
              />
            ) : null}
            {entry.storyId ? (
              <p className="mt-3 font-sans text-sm">
                <Link href={`/stories/${entry.storyId}`} className="text-seal">Open the story</Link>
              </p>
            ) : isSecretLocked(entry.secretUntil) ? (
              <p className="mt-3 font-sans text-sm text-gold">Share it after the secret date.</p>
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
