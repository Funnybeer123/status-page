import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { neededHeading, peopleNeedingFirst } from "@/lib/startHere";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });
  const [stories, photos] = await Promise.all([
    prisma.storyPerson.findMany({
      where: { story: { familyId: ctx.family.id } },
      select: { personId: true },
    }),
    prisma.personTag.findMany({
      where: { asset: { familyId: ctx.family.id, deletedAt: null } },
      select: { personId: true },
    }),
  ]);
  const tellers = await prisma.story.findMany({
    where: { familyId: ctx.family.id, tellerPersonId: { not: null } },
    select: { tellerPersonId: true },
  });
  const storyIds = [...stories.map((row) => row.personId), ...tellers.map((row) => row.tellerPersonId!).filter(Boolean)];
  const withoutStory = peopleNeedingFirst(people, storyIds);
  const withoutPhoto = peopleNeedingFirst(
    people,
    photos.map((row) => row.personId),
  );
  return NextResponse.json({
    withoutStory,
    withoutPhoto,
    heading: neededHeading(withoutStory.length, withoutPhoto.length),
  });
}
