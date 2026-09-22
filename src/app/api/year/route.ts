import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileThisYear, thisYearHeading } from "@/lib/thisYear";
import { hidePhotoFromAudience, shouldHideLivingFacts } from "@/lib/privacy";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const year = Number.parseInt(new URL(req.url).searchParams.get("year") || "", 10) || new Date().getUTCFullYear();
  const [people, stories, photos, letters, events] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, birthDate: true, deathDate: true },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id }, select: { id: true, title: true, recordedAt: true } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      include: { tags: { include: { person: true } } },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
      select: { id: true, title: true, writtenAt: true },
    }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, title: true, personId: true, happenedOn: true },
    }),
  ]);
  const visiblePeople = people.filter((person) => !shouldHideLivingFacts(ctx.role, person) || Boolean(person.deathDate));
  const visiblePhotos = photos.filter((photo) => !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person)));
  const items = compileThisYear({
    year,
    people: visiblePeople,
    stories,
    photos: visiblePhotos,
    letters,
    events,
  });
  return NextResponse.json({ year, items, heading: thisYearHeading(year, items.length) });
}
