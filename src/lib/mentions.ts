import { prisma } from "@/lib/prisma";

export function mentionNames(body: string) {
  return [...body.matchAll(/@([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+)?)/g)].map((match) => match[1].trim());
}

function nameMatches(needle: string, value?: string | null) {
  if (!value) return false;
  const hay = value.toLowerCase();
  const want = needle.toLowerCase();
  return hay === want || hay.startsWith(want) || hay.split(/\s+/)[0] === want;
}

export async function notifyMentions(input: {
  familyId: string;
  actorId: string;
  body: string;
  href: string;
}) {
  const names = mentionNames(input.body);
  if (!names.length) return [];
  const members = await prisma.membership.findMany({
    where: { familyId: input.familyId },
    include: { user: { select: { id: true, name: true } }, person: { select: { displayName: true } } },
  });
  const targets = new Set<string>();
  for (const name of names) {
    for (const member of members) {
      if (member.userId === input.actorId) continue;
      if (nameMatches(name, member.user.name) || nameMatches(name, member.person?.displayName)) {
        targets.add(member.userId);
      }
    }
  }
  if (!targets.size) return [];
  await prisma.notification.createMany({
    data: [...targets].map((userId) => ({
      familyId: input.familyId,
      userId,
      actorId: input.actorId,
      title: "Mentioned you in a comment",
      body: input.body.slice(0, 160),
      href: input.href,
    })),
  });
  return [...targets];
}
