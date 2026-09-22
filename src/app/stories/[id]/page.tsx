import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { CommentThread } from "@/components/CommentThread";
import { canWrite } from "@/lib/roles";
import { KeepOutToggle } from "@/app/follow/ui";
import { keepOutLine } from "@/lib/keepOut";
import { StoryEditForm } from "@/app/ask-save/ui";
import { askCitationLine } from "@/lib/askStory";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const story = await prisma.story.findFirst({
    where: { id, familyId: ctx.family.id },
      include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: { include: { document: true, asset: true } },
      comments: { include: { author: true } },
      promptAnswers: { include: { asset: true, prompt: true } },
    },
  });
  if (!story) notFound();

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Story</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="story-title">{story.title}</h1>
      <p className="mt-2 text-bark">
        {formatDate(story.recordedAt, "Undated")}
        {story.teller ? (
          <>
            {" · told by "}
            <Link className="text-seal" href={`/people/${story.teller.id}`}>{story.teller.displayName}</Link>
          </>
        ) : null}
      </p>
      <article className="paper-card mt-8 whitespace-pre-wrap p-6 text-lg leading-relaxed" data-testid="story-body">{story.body}</article>
      {canWrite(ctx.role) ? <StoryEditForm storyId={story.id} title={story.title} body={story.body} /> : null}
      {story.citations.length ? (
        <section className="mt-8" data-testid="story-citations">
          <h2 className="font-display text-2xl">Citations kept</h2>
          <ul className="mt-3 space-y-2">
            {story.citations.map((citation) => (
              <li key={citation.id} className="paper-card p-4">
                {citation.documentId ? (
                  <Link href={`/letters/${citation.documentId}`} className="text-seal">
                    {askCitationLine(citation.document?.title || citation.pageNote || citation.claim)}
                  </Link>
                ) : citation.assetId ? (
                  <Link href={`/archive/${citation.assetId}`} className="text-seal">
                    {askCitationLine(citation.asset?.title || citation.pageNote || citation.claim)}
                  </Link>
                ) : (
                  <p className="text-bark">{askCitationLine(citation.claim)}</p>
                )}
                {citation.claim ? <p className="mt-2 text-bark">{citation.claim}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {story.promptAnswers[0]?.asset ? (
        <audio
          controls
          src={`/api/media/${story.promptAnswers[0].asset.storagePath}`}
          className="mt-6 w-full"
          data-testid="story-spoken"
        />
      ) : null}
      <div className="mt-8">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">People</p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {story.people.map((item) => (
            <li key={item.personId}>
              <Link className="text-seal" href={`/people/${item.person.id}`}>{item.person.displayName}</Link>
            </li>
          ))}
        </ul>
      </div>
      {story.document ? (
        <p className="mt-6 font-sans text-sm text-bark">
          {story.keepOutOfAsk
            ? keepOutLine(story.title, true)
            : "Also kept as a note so Ask can find it. Search or ask about the words above."}
        </p>
      ) : null}
      {canWrite(ctx.role) ? <KeepOutToggle kind="story" id={story.id} keepOut={story.keepOutOfAsk} /> : null}
      <CommentThread comments={story.comments} storyId={story.id} canWrite={canWrite(ctx.role)} />
    </AppShell>
  );
}
