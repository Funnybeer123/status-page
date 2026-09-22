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
import { FragileToggle } from "@/app/card/ui";
import { fragileOriginalLabel } from "@/lib/fragileLetter";
import { clippingPageHeading } from "@/lib/clippingPage";
import { isTranscriptLocked, transcriptCreditLine, transcriptLockHeading } from "@/lib/transcriptLock";
import { compareHeading, compareSideLabel, hasEdits, latestRevision } from "@/lib/transcriptCompare";
import { highlightHeading, highlightHitCount, highlightSearchWords } from "@/lib/searchHighlight";
import { CiteBlock } from "@/components/CiteBlock";
import { PostmarkForm } from "@/app/then-now/ui";
import { hasPostmark, postmarkHeading, postmarkWrittenLine } from "@/lib/postmark";
import { PostageForm } from "@/app/family-hour/ui";
import { FoldForm } from "@/app/story-circle/ui";
import { PaperMillForm } from "@/app/register/ui";
import { hasPaperMill, paperMillLine } from "@/lib/paperMill";
import { holderLine } from "@/lib/originalHolder";
import { hasPostage, postageLine } from "@/lib/postage";
import { foldLine, hasFold } from "@/lib/letterFold";
import { SecretUntilForm, WeatherForm, OcrConfidenceForm } from "@/app/memory-lane/ui";
import { ReadLaterButton } from "@/app/alive-when/ui";
import { hiddenSecretBody, isSecretLocked, secretUntilLine } from "@/lib/secretUntil";
import { hasWeather, weatherNoteLine, weatherOnDayHeading } from "@/lib/weatherNote";
import { ocrConfidenceLine } from "@/lib/ocrConfidence";

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
      heldBy: true,
      replyTo: true,
      replies: { orderBy: { writtenAt: "asc" } },
      handwritingSamples: { include: { person: true } },
    },
  });
  if (!letter) notFound();
  const locked = isSecretLocked(letter.secretUntil);
  const shownTranscript = locked ? hiddenSecretBody() : letter.transcript;

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{letter.kind}</p>
      <h1 className="mt-2 font-display text-4xl">{letter.title}</h1>
      {letter.fragileOriginal ? (
        <p className="mt-2 font-sans text-sm uppercase tracking-[0.2em] text-gold" data-testid="fragile-original">
          {fragileOriginalLabel()}
        </p>
      ) : null}
      <p className="mt-2 text-bark">
        {formatDate(letter.writtenAt, "Undated")}
        {letter.people.length ? ` · ${letter.people.map((item) => item.person.displayName).join(", ")}` : ""}
        {letter.needsReview ? " · Needs a transcript check" : ""}
        {isTranscriptLocked(letter) ? ` · ${transcriptLockHeading(true)}` : ""}
        {letter.secretUntil ? ` · ${secretUntilLine(letter.secretUntil)}` : ""}
      </p>
      {letter.secretUntil ? (
        <p className="mt-2 font-sans text-sm text-gold" data-testid="letter-secret-until">
          {secretUntilLine(letter.secretUntil)}
        </p>
      ) : null}
      {letter.needsReview ? (
        <p className="mt-2 font-sans text-sm text-gold" data-testid="letter-ocr-confidence">
          {ocrConfidenceLine(letter.ocrConfidence)}
        </p>
      ) : null}
      <p className="mt-3 font-sans text-sm">
        <Link href={`/letters/${letter.id}/room`} className="text-seal" data-testid="reading-room-link">
          Open the reading room
        </Link>
        {" · "}
        <Link href={`/letters/${letter.id}/aloud`} className="text-seal" data-testid="read-aloud-link">
          Read aloud
        </Link>
        {" · "}
        <Link href={`/letters/${letter.id}/envelope`} className="text-seal" data-testid="envelope-link">
          Envelope
        </Link>
        {" · "}
        <Link href="/letters/postmarks" className="text-seal" data-testid="postmark-link">
          Postmarks
        </Link>
        {" · "}
        <Link href="/letters/postage" className="text-seal" data-testid="postage-link">
          Postage
        </Link>
        {" · "}
        <Link href={`/letters/${letter.id}/fold`} className="text-seal" data-testid="fold-link">
          Fold
        </Link>
        {" · "}
        <Link href={`/letters/${letter.id}/margins`} className="text-seal" data-testid="margins-link">
          Margin notes
        </Link>
        {" · "}
        <Link href="/letters/paper" className="text-seal" data-testid="paper-link">
          Paper mill
        </Link>
        {letter.people[0] ? (
          <>
            {" · "}
            <Link href={`/letters/pair?personId=${letter.people[0].personId}`} className="text-seal">
              Two letters by {letter.people[0].person.displayName}
            </Link>
          </>
        ) : null}
        {" · "}
        <ReadLaterButton documentId={letter.id} />
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
            dangerouslySetInnerHTML={{ __html: highlightSearchWords(shownTranscript, q) }}
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
          transcript={shownTranscript}
          translation={locked ? "" : letter.translation || ""}
          writtenAt={letter.writtenAt ? letter.writtenAt.toISOString().slice(0, 10) : ""}
          needsReview={letter.needsReview}
          canEdit={canWrite(ctx.role) && !locked}
          locked={isTranscriptLocked(letter) || locked}
          credit={transcriptCreditLine(letter.transcribedBy?.name)}
        />
      </div>
      {letter.translation && !locked ? (
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
      {hasEdits(letter.revisions) && !locked ? (
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
              <p className="mt-2 whitespace-pre-wrap text-bark">{shownTranscript}</p>
            </article>
          </div>
        </section>
      ) : null}
      {letter.revisions.length && !locked ? (
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
      {hasWeather(letter) || canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-weather">
          <h2 className="font-display text-2xl">{weatherOnDayHeading(letter.title)}</h2>
          <p className="mt-2 text-bark">{weatherNoteLine(letter.weather, letter.writtenAt)}</p>
          {canWrite(ctx.role) ? <WeatherForm documentId={letter.id} weather={letter.weather} /> : null}
        </section>
      ) : null}
      {canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-secret">
          <h2 className="font-display text-2xl">Kept secret until</h2>
          <SecretUntilForm
            documentId={letter.id}
            until={letter.secretUntil ? letter.secretUntil.toISOString().slice(0, 10) : ""}
          />
        </section>
      ) : null}
      {letter.needsReview && canWrite(ctx.role) ? (
        <OcrConfidenceForm documentId={letter.id} score={letter.ocrConfidence} />
      ) : null}
      {hasPostmark(letter) || canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-postmark">
          <h2 className="font-display text-2xl">{postmarkHeading(letter.title)}</h2>
          <p className="mt-2 text-bark">{postmarkWrittenLine(letter.writtenAt, letter.stampText, letter.postmarkedAt)}</p>
          {canWrite(ctx.role) ? (
            <PostmarkForm
              letterId={letter.id}
              stamp={letter.stampText}
              when={letter.postmarkedAt ? letter.postmarkedAt.toISOString().slice(0, 10) : ""}
            />
          ) : null}
        </section>
      ) : null}
      {hasPostage(letter) || canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-postage">
          <h2 className="font-display text-2xl">{postageLine(letter.postage)}</h2>
          {canWrite(ctx.role) ? <PostageForm letterId={letter.id} postage={letter.postage} /> : null}
        </section>
      ) : null}
      {hasFold(letter) || canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-fold">
          <h2 className="font-display text-2xl">{foldLine(letter.foldPattern)}</h2>
          {canWrite(ctx.role) ? <FoldForm letterId={letter.id} foldPattern={letter.foldPattern} /> : null}
        </section>
      ) : null}
      {hasPaperMill(letter) || canWrite(ctx.role) ? (
        <section className="mt-10" data-testid="letter-paper">
          <h2 className="font-display text-2xl">{paperMillLine(letter.paperMill)}</h2>
          {canWrite(ctx.role) ? <PaperMillForm letterId={letter.id} paperMill={letter.paperMill} /> : null}
        </section>
      ) : null}
      {letter.heldBy ? (
        <p className="mt-4 text-bark" data-testid="letter-holder">
          {holderLine(letter.title, letter.heldBy.displayName)}
        </p>
      ) : null}
      <CiteBlock title={letter.title} path={`/letters/${letter.id}`} />
      {canWrite(ctx.role) ? <FragileToggle letterId={letter.id} fragile={letter.fragileOriginal} /> : null}
      {canWrite(ctx.role) ? <KeepOutToggle kind="letter" id={letter.id} keepOut={letter.keepOutOfAsk} /> : null}
      {canWrite(ctx.role) ? <TrashRestore type="letter" id={letter.id} /> : null}
      <CommentThread comments={letter.comments} documentId={letter.id} canWrite={canWrite(ctx.role)} />
    </AppShell>
  );
}
