import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LetterEditor } from "@/app/letters/[id]/ui";
import { CommentThread } from "@/components/CommentThread";
import { TrashRestore } from "@/app/trash/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { KeepOutToggle } from "@/app/follow/ui";
import { clippingPageHeading } from "@/lib/clippingPage";
import { isTranscriptLocked, transcriptCreditLine, transcriptLockHeading } from "@/lib/transcriptLock";
import { compareHeading, compareSideLabel, hasEdits, latestRevision } from "@/lib/transcriptCompare";
import { highlightHeading, highlightHitCount, highlightSearchWords } from "@/lib/searchHighlight";

export default async function LetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireFamily();
  const { id } = await params;
  const { q = "" } = await searchParams;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      asset: true,
      people: { include: { person: true } },
      comments: { include: { author: true } },
      revisions: { include: { editedBy: { select: { name: true } } }, orderBy: { editedAt: "desc" } },
      transcribedBy: { select: { name: true } },
      replyTo: true,
      replies: { orderBy: { writtenAt: "asc" } },
      handwritingSamples: { include: { person: true } },
    },
  });
  if (!letter) notFound();

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{letter.kind}</p>
      <h1 className="mt-2 font-display text-4xl">{letter.title}</h1>
      <p className="mt-2 text-bark">
        {formatDate(letter.writtenAt, "Undated")}
        {letter.people.length ? ` · ${letter.people.map((item) => item.person.displayName).join(", ")}` : ""}
        {letter.needsReview ? " · Needs a transcript check" : ""}
        {isTranscriptLocked(letter) ? ` · ${transcriptLockHeading(true)}` : ""}
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href={`/letters/${letter.id}/room`} className="text-seal" data-testid="reading-room-link">
          Open the reading room
        </Link>
      </p>
      {letter.replyTo ? (
        <p className="mt-2 font-sans text-sm" data-testid="letter-reply-to">
          In reply to{" "}
          <Link href={`/letters/${letter.replyTo.id}`} className="text-seal">{letter.replyTo.title}</Link>
        </p>
      ) : null}
      {q.trim() ? (
        <section className="mt-8 paper-card p-5" data-testid="letter-highlight">
          <h2 className="font-display text-2xl">{highlightHeading(q, highlightHitCount(letter.transcript, q))}</h2>
          <p
            className="mt-3 whitespace-pre-wrap text-lg leading-relaxed [&_mark]:bg-gold/30 [&_mark]:px-0.5"
            data-testid="letter-highlight-body"
            dangerouslySetInnerHTML={{ __html: highlightSearchWords(letter.transcript, q) }}
          />
        </section>
      ) : null}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="paper-card overflow-hidden p-4">
          {letter.asset ? (
            <figure data-testid={letter.kind === "clipping" ? "clipping-page" : "letter-scan"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${letter.asset.storagePath}`} alt={letter.title} className="w-full bg-cream" />
              {letter.kind === "clipping" ? (
                <figcaption className="mt-2 font-sans text-sm text-gold">{clippingPageHeading(letter.title)}</figcaption>
              ) : null}
            </figure>
          ) : (
            <p className="text-bark">This note has no scan — only the family&apos;s words.</p>
          )}
        </div>
        <LetterEditor
          id={letter.id}
          title={letter.title}
          transcript={letter.transcript}
          translation={letter.translation || ""}
          writtenAt={letter.writtenAt ? letter.writtenAt.toISOString().slice(0, 10) : ""}
          needsReview={letter.needsReview}
          canEdit={canWrite(ctx.role)}
          locked={isTranscriptLocked(letter)}
          credit={transcriptCreditLine(letter.transcribedBy?.name)}
        />
      </div>
      {letter.translation ? (
        <section className="mt-8 paper-card p-5" data-testid="letter-translation-view">
          <h2 className="font-display text-2xl">Translation</h2>
          <p className="mt-2 whitespace-pre-wrap text-bark">{letter.translation}</p>
        </section>
      ) : null}
      {letter.replies.length ? (
        <section className="mt-8" data-testid="letter-replies">
          <h2 className="font-display text-2xl">Replies</h2>
          <ul className="mt-3 space-y-2">
            {letter.replies.map((reply) => (
              <li key={reply.id}>
                <Link href={`/letters/${reply.id}`} className="text-seal">{reply.title}</Link>
                <span className="ml-2 font-sans text-sm text-bark">{formatDate(reply.writtenAt, "")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hasEdits(letter.revisions) ? (
        <section className="mt-10" data-testid="transcript-compare">
          <h2 className="font-display text-2xl">{compareHeading()}</h2>
          <p className="mt-2 font-sans text-sm">
            <Link href={`/letters/${letter.id}/compare`} className="text-seal">Open the side-by-side page</Link>
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="paper-card p-4">
              <h3 className="font-display text-xl">{compareSideLabel("earlier")}</h3>
              <p className="mt-2 whitespace-pre-wrap text-bark">{latestRevision(letter.revisions)?.transcript}</p>
            </article>
            <article className="paper-card p-4">
              <h3 className="font-display text-xl">{compareSideLabel("current")}</h3>
              <p className="mt-2 whitespace-pre-wrap text-bark">{letter.transcript}</p>
            </article>
          </div>
        </section>
      ) : null}
      {letter.revisions.length ? (
        <section className="mt-10" data-testid="transcript-history">
          <h2 className="font-display text-2xl">Earlier transcripts</h2>
          <ol className="mt-4 space-y-3">
            {letter.revisions.map((revision) => (
              <li key={revision.id} className="paper-card p-4">
                <p className="font-sans text-sm text-gold">
                  {revision.editedBy.name} · {formatDate(revision.editedAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-bark">{revision.transcript}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {letter.handwritingSamples.length ? (
        <section className="mt-8" data-testid="letter-handwriting">
          <h2 className="font-display text-2xl">Handwriting</h2>
          <ul className="mt-3 space-y-2">
            {letter.handwritingSamples.map((sample) => (
              <li key={sample.id}>
                <Link href={`/people/${sample.personId}`} className="text-seal">{sample.person.displayName}</Link>
                {sample.notes ? <span className="ml-2 font-sans text-sm text-bark">{sample.notes}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {canWrite(ctx.role) ? <KeepOutToggle kind="letter" id={letter.id} keepOut={letter.keepOutOfAsk} /> : null}
      {canWrite(ctx.role) ? <TrashRestore type="letter" id={letter.id} /> : null}
      <CommentThread comments={letter.comments} documentId={letter.id} canWrite={canWrite(ctx.role)} />
    </AppShell>
  );
}
