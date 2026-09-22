import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { followFeedHeading } from "@/lib/follows";

export default async function FollowingNewPage() {
  const ctx = await requireFamily();
  const follows = await prisma.personFollow.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id } },
    select: { personId: true, person: { select: { displayName: true } } },
  });
  const personIds = follows.map((item) => item.personId);
  const names = new Map(follows.map((item) => [item.personId, item.person.displayName]));
  const [stories, letters, photos] = personIds.length
    ? await Promise.all([
        prisma.story.findMany({
          where: { familyId: ctx.family.id, people: { some: { personId: { in: personIds } } } },
          include: { people: true },
          orderBy: { recordedAt: "desc" },
          take: 12,
        }),
        prisma.document.findMany({
          where: {
            familyId: ctx.family.id,
            deletedAt: null,
            kind: { in: ["letter", "note"] },
            people: { some: { personId: { in: personIds } } },
          },
          include: { people: true },
          orderBy: { writtenAt: "desc" },
          take: 12,
        }),
        prisma.asset.findMany({
          where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", tags: { some: { personId: { in: personIds } } } },
          include: { tags: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      ])
    : [[], [], []];
  const items = [
    ...stories.map((story) => ({
      id: `story-${story.id}`,
      title: story.title,
      href: `/stories/${story.id}`,
      name: story.people.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
    ...letters.map((letter) => ({
      id: `letter-${letter.id}`,
      title: letter.title,
      href: `/letters/${letter.id}`,
      name: letter.people.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
    ...photos.map((photo) => ({
      id: `photo-${photo.id}`,
      title: photo.title || "A photograph",
      href: `/archive/${photo.id}`,
      name: photo.tags.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
  ];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="follow-feed-heading">
        {followFeedHeading(items.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="follow-feed">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-sm text-gold">{item.name}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing new about the people you follow.</li> : null}
      </ul>
    </AppShell>
  );
}
