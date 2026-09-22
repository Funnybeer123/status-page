import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { chapterHeading, compileLifeChapters } from "@/lib/chapters";
import { formatDate } from "@/lib/dates";
import { ChapterForm } from "@/app/people/chapter-form";
import { PersonSearchForm } from "@/app/people/search-form";

export default async function PersonChaptersPage({ params }: { params: Promise<{ id: string }> }) {
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
        })),
        ...person.storyLinks.map((link) => ({
          id: link.story.id,
          kind: "story" as const,
          title: link.story.title,
          happenedOn: link.story.recordedAt,
          href: `/stories/${link.story.id}`,
        })),
        ...person.documents
          .filter((item) => item.document.kind !== "story" && !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            kind: "letter" as const,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
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
        })),
      ];
  const chapters = compileLifeChapters({
    birthDate: hidden ? null : person.birthDate,
    deathDate: person.deathDate,
    named: hidden ? [] : person.lifeChapters,
    items,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="chapters-heading">Life chapters</h1>
      <p className="mt-3 max-w-2xl text-bark">Childhood, work, and later years, grouping this person’s stories, photographs, and letters.</p>
      <PersonSearchForm personId={person.id} />
      {canWrite(ctx.role) && !hidden ? <ChapterForm personId={person.id} /> : null}
      <div className="mt-10 space-y-8" data-testid="chapters-list">
        {chapters.map((chapter) => (
          <section key={chapter.id} className="paper-card p-5" data-testid={`chapter-${chapter.kind}`}>
            <h2 className="font-display text-2xl">{chapterHeading(chapter)}</h2>
            <p className="font-sans text-sm text-gold">
              {formatDate(chapter.startedOn, "")}
              {chapter.endedOn ? ` – ${formatDate(chapter.endedOn)}` : ""}
            </p>
            {chapter.notes ? <p className="mt-2 text-bark">{chapter.notes}</p> : null}
            <ul className="mt-4 space-y-2">
              {chapter.items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <span className="font-sans text-xs uppercase tracking-wide text-gold">{item.kind}</span>{" "}
                  <Link href={item.href} className="text-seal">{item.title}</Link>
                  <span className="ml-2 font-sans text-sm text-bark">{formatDate(item.happenedOn, "")}</span>
                </li>
              ))}
              {!chapter.items.length ? <li className="text-bark">Nothing filed in this chapter yet.</li> : null}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
