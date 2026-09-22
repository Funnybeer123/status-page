import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer, hideMinorDetails, hidePhotoFromAudience, shouldHideLivingFacts } from "@/lib/privacy";
import { compileSameDay, emptySameDayHeading, sameDayHeading } from "@/lib/sameDay";

export default async function PersonSameDayPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      tags: { include: { asset: { include: { tags: { include: { person: true } } } } } },
      documents: { include: { document: true } },
      events: true,
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
  });
  if (!person) notFound();
  const hideChild = hideMinorDetails(ctx.role, person);
  const hidden = shouldHideLivingFacts(ctx.role, person);
  const items = hideChild
    ? []
    : compileSameDay([
        ...(!hidden && person.birthDate
          ? [{ id: `birth-${person.id}`, title: `Born · ${person.displayName}`, happenedOn: person.birthDate, href: `/people/${person.id}`, kind: "birth" }]
          : []),
        ...(person.deathDate
          ? [{ id: `death-${person.id}`, title: `Died · ${person.displayName}`, happenedOn: person.deathDate, href: `/people/${person.id}`, kind: "death" }]
          : []),
        ...person.events
          .filter((event) => !hideEventFromViewer(ctx.role, { ...event, person }))
          .map((event) => ({
            id: event.id,
            title: event.title,
            happenedOn: event.happenedOn,
            href: `/people/${person.id}`,
            kind: "event",
          })),
        ...person.documents
          .filter((item) => !item.document.deletedAt && item.document.kind !== "story")
          .map((item) => ({
            id: item.document.id,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
            kind: "letter",
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt && !hidePhotoFromAudience(ctx.role, tag.asset.tags.map((row) => row.person)))
          .map((tag) => ({
            id: tag.asset.id,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
            kind: "photo",
          })),
        ...[...person.storiesTold, ...person.storyLinks.map((link) => link.story)].map((story) => ({
          id: story.id,
          title: story.title,
          happenedOn: story.recordedAt,
          href: `/stories/${story.id}`,
          kind: "story",
        })),
      ]);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="same-day-heading">
        {items.length ? sameDayHeading(person.displayName) : emptySameDayHeading(person.displayName)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
        {" · "}
        <Link href="/people/sameday" className="text-seal">Everyone on this day</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="same-day-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.year} · {item.title}
            </Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptySameDayHeading(person.displayName)}</li> : null}
      </ul>
    </AppShell>
  );
}
