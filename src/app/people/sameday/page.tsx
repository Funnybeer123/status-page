import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails } from "@/lib/privacy";
import { compileSameDay, familySameDayHeading } from "@/lib/sameDay";

export default async function FamilySameDayPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: {
      events: true,
      documents: { include: { document: true } },
      tags: { include: { asset: true } },
      storiesTold: true,
    },
    orderBy: { displayName: "asc" },
  });
  const rows = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .map((person) => ({
      person,
      items: compileSameDay([
        ...(person.birthDate
          ? [{ id: `birth-${person.id}`, title: "Born", happenedOn: person.birthDate, href: `/people/${person.id}` }]
          : []),
        ...(person.deathDate
          ? [{ id: `death-${person.id}`, title: "Died", happenedOn: person.deathDate, href: `/people/${person.id}` }]
          : []),
        ...person.events.map((event) => ({
          id: event.id,
          title: event.title,
          happenedOn: event.happenedOn,
          href: `/people/${person.id}`,
        })),
        ...person.documents
          .filter((item) => !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt)
          .map((tag) => ({
            id: tag.asset.id,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
          })),
        ...person.storiesTold.map((story) => ({
          id: story.id,
          title: story.title,
          happenedOn: story.recordedAt,
          href: `/stories/${story.id}`,
        })),
      ]),
    }))
    .filter((row) => row.items.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="family-same-day-heading">
        {familySameDayHeading(rows.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/sameday/missing" className="text-seal">People with nothing on this day</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="family-same-day-list">
        {rows.map((row) => (
          <li key={row.person.id} className="paper-card p-5">
            <Link href={`/people/${row.person.id}/sameday`} className="font-display text-2xl text-seal">
              {row.person.displayName}
            </Link>
            <p className="text-bark">{row.items[0]?.title}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{familySameDayHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
