export function followHeading(count: number) {
  if (!count) return "You are not following anyone yet";
  if (count === 1) return "Following 1 person";
  return `Following ${count} people`;
}

export function followLine(name: string) {
  return `Following ${name.trim() || "a relative"}`;
}

export function followNoticeTitle(kind: "story" | "photo" | "letter", name: string) {
  const who = name.trim() || "someone in the family";
  if (kind === "story") return `A story was added about ${who}`;
  if (kind === "photo") return `A photograph was added about ${who}`;
  return `A letter was added about ${who}`;
}

export function followNoticeBody(kind: "story" | "photo" | "letter", title: string) {
  const label = title.trim() || (kind === "photo" ? "A photograph" : kind === "story" ? "A story" : "A letter");
  return label;
}

export function followFeedHeading(count: number) {
  if (!count) return "Nothing new about the people you follow";
  if (count === 1) return "1 new thing about someone you follow";
  return `${count} new things about people you follow`;
}

export function muteHeading(muted: boolean) {
  return muted ? "Notices from this person are muted" : "You will get notices about this person";
}

export function mutedFollowsHeading(count: number) {
  if (!count) return "No muted follows";
  if (count === 1) return "1 muted follow";
  return `${count} muted follows`;
}

export function muteLine(name: string, muted: boolean) {
  const who = name.trim() || "this person";
  return muted ? `${who} · notices muted` : followLine(who);
}

export type FollowKind = "story" | "photo" | "letter";

export function followHref(kind: FollowKind, entityId: string) {
  if (kind === "story") return `/stories/${entityId}`;
  if (kind === "photo") return `/archive/${entityId}`;
  return `/letters/${entityId}`;
}

export async function notifyFollowers(input: {
  familyId: string;
  actorId: string;
  personIds: string[];
  kind: FollowKind;
  title: string;
  entityId: string;
}) {
  const { prisma } = await import("@/lib/prisma");
  const personIds = [...new Set(input.personIds.filter(Boolean))];
  if (!personIds.length) return 0;
  const follows = await prisma.personFollow.findMany({
    where: { personId: { in: personIds }, userId: { not: input.actorId }, mutedAt: null },
    include: { person: { select: { displayName: true } } },
  });
  if (!follows.length) return 0;
  const seen = new Set<string>();
  const rows = follows
    .filter((follow) => {
      const key = `${follow.userId}:${follow.personId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((follow) => ({
      familyId: input.familyId,
      userId: follow.userId,
      actorId: input.actorId,
      title: followNoticeTitle(input.kind, follow.person.displayName),
      body: followNoticeBody(input.kind, input.title),
      href: followHref(input.kind, input.entityId),
    }));
  if (!rows.length) return 0;
  await prisma.notification.createMany({ data: rows });
  return rows.length;
}
