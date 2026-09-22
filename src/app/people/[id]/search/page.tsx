import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { personSearchHeading, searchPersonItems } from "@/lib/personSearch";
import { PersonSearchForm } from "@/app/people/search-form";

export default async function PersonSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireFamily();
  const { id } = await params;
  const { q = "" } = await searchParams;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
      events: true,
      lifeChapters: true,
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
          body: story.body,
          href: `/stories/${story.id}`,
        })),
        ...person.storyLinks.map((link) => ({
          id: link.story.id,
          kind: "story" as const,
          title: link.story.title,
          body: link.story.body,
          href: `/stories/${link.story.id}`,
        })),
        ...person.documents
          .filter((item) => !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            kind: "letter" as const,
            title: item.document.title,
            body: item.document.transcript,
            href: `/letters/${item.document.id}`,
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt)
          .map((tag) => ({
            id: tag.asset.id,
            kind: "photo" as const,
            title: tag.asset.title || "Photograph",
            body: "",
            href: `/archive/${tag.asset.id}`,
          })),
        ...person.events.map((event) => ({
          id: event.id,
          kind: "event" as const,
          title: event.title,
          body: event.summary,
          href: `/people/${person.id}#event-${event.id}`,
        })),
        ...(person.notes
          ? [{ id: `${person.id}-note`, kind: "note" as const, title: "Notes", body: person.notes, href: `/people/${person.id}` }]
          : []),
        ...person.lifeChapters.map((chapter) => ({
          id: chapter.id,
          kind: "chapter" as const,
          title: chapter.title,
          body: chapter.notes,
          href: `/people/${person.id}/chapters`,
        })),
      ];
  const hits = searchPersonItems(items, q);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="person-search-heading">{personSearchHeading(q, hits.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Look through this person’s letters, stories, photographs, and events.</p>
      <PersonSearchForm personId={person.id} query={q} />
      <ul className="mt-10 space-y-3" data-testid="person-search-results">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{hit.kind}</p>
            <Link href={hit.href} className="font-display text-2xl text-seal">{hit.title}</Link>
            {hit.snippet ? <p className="mt-2 text-bark">{hit.snippet}</p> : null}
          </li>
        ))}
        {q && !hits.length ? <li className="text-bark">Nothing in this life matches that yet.</li> : null}
      </ul>
    </AppShell>
  );
}
