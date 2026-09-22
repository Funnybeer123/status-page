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
  return "/activity";
}
