import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { startHeading, startSteps } from "@/lib/startHere";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const claimedId = ctx.membership.personId;
  const hasStory = claimedId
    ? (await prisma.story.count({
        where: {
          familyId: ctx.family.id,
          OR: [{ tellerPersonId: claimedId }, { people: { some: { personId: claimedId } } }],
        },
      })) > 0
    : false;
  const hasPhoto = claimedId
    ? (await prisma.asset.count({
        where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: claimedId } } },
      })) > 0
    : false;
  const steps = startSteps({ claimed: Boolean(claimedId), hasStory, hasPhoto });
  return NextResponse.json({
    claimed: Boolean(claimedId),
    personId: claimedId,
    hasStory,
    hasPhoto,
    steps,
    heading: startHeading(steps),
  });
}
