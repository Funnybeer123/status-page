import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails } from "@/lib/privacy";
import { compileSameDay, missingSameDayHeading } from "@/lib/sameDay";

export default async function MissingSameDayPage() {
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
  const missing = people.filter((person) => {
    if (hideMinorDetails(ctx.role, person)) return false;
    return !compileSameDay([
      ...(person.birthDate ? [{ id: `b-${person.id}`, title: "Born", happenedOn: person.birthDate, href: "#" }] : []),
      ...(person.deathDate ? [{ id: `d-${person.id}`, title: "Died", happenedOn: person.deathDate, href: "#" }] : []),
      ...person.events.map((event) => ({ id: event.id, title: event.title, happenedOn: event.happenedOn, href: "#" })),
      ...person.documents.map((item) => ({ id: item.document.id, title: item.document.title, happenedOn: item.document.writtenAt, href: "#" })),
      ...person.tags.map((tag) => ({ id: tag.asset.id, title: tag.asset.title || "Photograph", happenedOn: tag.asset.capturedAt, href: "#" })),
      ...person.storiesTold.map((story) => ({ id: story.id, title: story.title, happenedOn: story.recordedAt, href: "#" })),
    ]).length;
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-same-day-heading">
        {missingSameDayHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-same-day-list">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingSameDayHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
