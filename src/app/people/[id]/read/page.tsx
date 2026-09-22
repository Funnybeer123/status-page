import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { compileLifeChapters } from "@/lib/chapters";
import { compileLifeReading } from "@/lib/lifeReading";

export default async function PersonReadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      lifeChapters: true,
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
      events: true,
    },
  });
  if (!person) notFound();
  const hidden = hideMinorDetails(ctx.role, person) || shouldHideLivingFacts(ctx.role, person);
  const items = hidden
    ? []
    : [
        ...person.storiesTold.map((story) => ({
          id: story.id,
          kind: "story" as const,
          title: story.title,
          happenedOn: story.recordedAt,
          href: `/stories/${story.id}`,
          body: story.body,
        })),
        ...person.storyLinks.map((link) => ({
          id: link.story.id,
          kind: "story" as const,
          title: link.story.title,
          happenedOn: link.story.recordedAt,
          href: `/stories/${link.story.id}`,
          body: link.story.body,
        })),
        ...person.documents
          .filter((item) => item.document.kind !== "story" && !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            kind: "letter" as const,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
            body: item.document.transcript,
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt)
          .map((tag) => ({
            id: tag.asset.id,
            kind: "photo" as const,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
          })),
        ...person.events.map((event) => ({
          id: event.id,
          kind: "event" as const,
          title: event.title,
          happenedOn: event.happenedOn,
          href: `/people/${person.id}#event-${event.id}`,
          body: event.summary,
        })),
      ];
  const chapters = compileLifeChapters({
    birthDate: hidden ? null : person.birthDate,
    deathDate: person.deathDate,
    named: hidden ? [] : person.lifeChapters,
    items,
  });
  const reading = compileLifeReading(person.displayName, chapters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
        {" · "}
        <Link href={`/people/${person.id}/chapters`} className="text-seal">Chapters</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="life-reading-heading">{reading.title}</h1>
      <p className="mt-3 max-w-2xl text-bark">Childhood, work, and later years as one continuous story.</p>
      <article className="paper-card mt-10 max-w-3xl space-y-8 p-8" data-testid="life-reading">
        {reading.paragraphs.map((paragraph) => (
          <section key={paragraph.id}>
            <h2 className="font-display text-3xl">{paragraph.heading}</h2>
            <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-bark">{paragraph.body}</p>
          </section>
        ))}
        {!reading.paragraphs.length ? <p className="text-bark">Nothing to read yet.</p> : null}
      </article>
    </AppShell>
  );
}
