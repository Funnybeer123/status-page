import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { followFeedHeading } from "@/lib/follows";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const follows = await prisma.personFollow.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id } },
    select: { personId: true, person: { select: { displayName: true } } },
  });
  const personIds = follows.map((item) => item.personId);
  const names = new Map(follows.map((item) => [item.personId, item.person.displayName]));
  if (!personIds.length) {
    return NextResponse.json({ items: [], heading: followFeedHeading(0) });
  }
  const [stories, letters, photos] = await Promise.all([
    prisma.story.findMany({
      where: { familyId: ctx.family.id, people: { some: { personId: { in: personIds } } } },
      include: { people: true },
      orderBy: { recordedAt: "desc" },
      take: 20,
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
      take: 20,
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", tags: { some: { personId: { in: personIds } } } },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const items = [
    ...stories.map((story) => ({
      id: `story-${story.id}`,
      kind: "story" as const,
      title: story.title,
      href: `/stories/${story.id}`,
      name: story.people.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
    ...letters.map((letter) => ({
      id: `letter-${letter.id}`,
      kind: "letter" as const,
      title: letter.title,
      href: `/letters/${letter.id}`,
      name: letter.people.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
    ...photos.map((photo) => ({
      id: `photo-${photo.id}`,
      kind: "photo" as const,
      title: photo.title || "A photograph",
      href: `/archive/${photo.id}`,
      name: photo.tags.map((row) => names.get(row.personId)).filter(Boolean)[0] || "Someone you follow",
    })),
  ];
  return NextResponse.json({ items, heading: followFeedHeading(items.length) });
}
