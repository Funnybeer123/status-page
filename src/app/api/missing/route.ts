import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { isParentRel } from "@/lib/rels";
import { missingInformation } from "@/lib/missing";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships, tags, stories, storyLinks] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null } },
      select: { personId: true },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id }, select: { tellerPersonId: true } }),
    prisma.storyPerson.findMany({
      where: { story: { familyId: ctx.family.id } },
      select: { personId: true },
    }),
  ]);
  const parentIds = new Set(
    relationships.filter((rel) => isParentRel(rel.type)).map((rel) => rel.toPersonId),
  );
  const photoIds = new Set(tags.map((tag) => tag.personId));
  const storyIds = new Set([
    ...stories.map((story) => story.tellerPersonId).filter(Boolean) as string[],
    ...storyLinks.map((link) => link.personId),
  ]);
  return NextResponse.json({ missing: missingInformation({ people, parentIds, photoIds, storyIds }) });
}
