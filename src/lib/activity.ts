import { prisma } from "@/lib/prisma";

export async function recordActivity(input: {
  familyId: string;
  actorId: string;
  verb: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  summary?: string | null;
}) {
  try {
    const activity = await prisma.activity.create({
      data: {
        familyId: input.familyId,
        actorId: input.actorId,
        verb: input.verb,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title,
        summary: input.summary ?? null,
      },
    });
    const href = activityHref(input.entityType, input.entityId);
    const members = await prisma.membership.findMany({
      where: { familyId: input.familyId, userId: { not: input.actorId } },
      select: { userId: true },
    });
    if (members.length) {
      await prisma.notification.createMany({
        data: members.map((member) => ({
          familyId: input.familyId,
          userId: member.userId,
          actorId: input.actorId,
          title: `${input.verb} ${input.title}`,
          body: input.summary ?? null,
          href,
        })),
      });
    }
    return activity;
  } catch (error) {
    console.error("activity log failed", error);
    return null;
  }
}

export function activityHref(entityType: string, entityId?: string | null) {
  if (!entityId) return "/activity";
  if (entityType === "person") return `/people/${entityId}`;
  if (entityType === "asset") return `/archive/${entityId}`;
  if (entityType === "document" || entityType === "clipping" || entityType === "obituary" || entityType === "will") {
    return `/letters/${entityId}`;
  }
  if (entityType === "capsule") return `/capsules/${entityId}`;
  if (entityType === "interview") return "/interviews";
  if (entityType === "branch") return "/branches";
  if (entityType === "cemetery") return `/cemeteries/${entityId}`;
  if (entityType === "pair") return "/pairs";
  if (entityType === "voyage") return "/voyages";
  if (entityType === "school") return "/schools";
  if (entityType === "reunion") return `/reunions/${entityId}`;
  if (entityType === "recipe") return `/recipes`;
  if (entityType === "tradition") return "/traditions";
  if (entityType === "task") return "/tasks";
  if (entityType === "prompt") return "/prompts";
  if (entityType === "photo") return `/archive/${entityId}`;
  if (entityType === "letter") return `/letters/${entityId}`;
  if (entityType === "story") return `/stories/${entityId}`;
  if (entityType === "album") return `/albums/${entityId}`;
  if (entityType === "event") return `/timeline#event-${entityId}`;
  if (entityType === "place") return "/map";
  if (entityType === "heirloom") return "/heirlooms";
  if (entityType === "custody") return "/custody";
  if (entityType === "business") return "/businesses";
  if (entityType === "award") return "/awards";
  if (entityType === "club") return "/clubs";
  if (entityType === "probate") return "/probate";
  if (entityType === "naturalization") return "/naturalizations";
  if (entityType === "address") return "/addresses";
  if (entityType === "apprenticeship") return "/apprentices";
  if (entityType === "mention") return "/mentions";
  if (entityType === "pet") return "/pets";
  if (entityType === "textile") return "/quilts";
  if (entityType === "dna") return "/dna";
  if (entityType === "loan") return "/loans";
  if (entityType === "home") return `/homes/${entityId}`;
  if (entityType === "digitize") return "/digitize";
  if (entityType === "pin") return "/";
  if (entityType === "handwriting") return "/handwriting";
  if (entityType === "inscription") return "/inscriptions";
  if (entityType === "holiday") return "/holidays";
  return "/activity";
}
