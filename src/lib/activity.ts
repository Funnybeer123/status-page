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
    return await prisma.activity.create({
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
  } catch (error) {
    console.error("activity log failed", error);
    return null;
  }
}

export function activityHref(entityType: string, entityId?: string | null) {
  if (!entityId) return "/activity";
  if (entityType === "person") return `/people/${entityId}`;
  if (entityType === "asset") return `/archive/${entityId}`;
  if (entityType === "document") return `/letters/${entityId}`;
  if (entityType === "story") return `/stories/${entityId}`;
  if (entityType === "album") return `/albums/${entityId}`;
  if (entityType === "event") return `/timeline#event-${entityId}`;
  if (entityType === "place") return "/map";
  return "/activity";
}
