import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { progressHeading, progressSteps, remainingSteps } from "@/lib/startHere";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const claimedId = ctx.membership.personId;
  const [hasStory, hasPhoto, hasThere] = await Promise.all([
    claimedId
      ? prisma.story.count({
          where: {
            familyId: ctx.family.id,
            OR: [{ tellerPersonId: claimedId }, { people: { some: { personId: claimedId } } }],
          },
        }).then((count) => count > 0)
      : Promise.resolve(false),
    claimedId
      ? prisma.asset.count({
          where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: claimedId } } },
        }).then((count) => count > 0)
      : Promise.resolve(false),
    claimedId
      ? prisma.eventWitness.count({
          where: { familyId: ctx.family.id, personId: claimedId, role: "there" },
        }).then((count) => count > 0)
      : Promise.resolve(false),
  ]);
  const steps = progressSteps({
    claimed: Boolean(claimedId),
    hasStory,
    hasPhoto,
    hasThere,
  });
  return NextResponse.json({
    claimed: Boolean(claimedId),
    personId: claimedId,
    hasStory,
    hasPhoto,
    hasThere,
    steps,
    remaining: remainingSteps(steps),
    heading: progressHeading(steps),
  });
}
