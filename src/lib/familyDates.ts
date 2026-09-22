import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReminders, upcomingReminders } from "@/lib/reminders";

export async function loadFamilyReminders(familyId: string, role: Role, from = new Date()) {
  const [people, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId } }),
    prisma.lifeEvent.findMany({
      where: { familyId, happenedOn: { not: null } },
      include: { person: true },
    }),
  ]);
  const reminders = buildReminders(
    [
      ...people
        .filter((person) => person.birthDate)
        .map((person) => ({
          id: `birth-${person.id}`,
          kind: "birthday" as const,
          title: `${person.displayName}'s birthday`,
          personId: person.id,
          personName: person.displayName,
          deathDate: person.deathDate,
          happenedOn: person.birthDate!,
        })),
      ...people
        .filter((person) => person.deathDate)
        .map((person) => ({
          id: `death-${person.id}`,
          kind: "death" as const,
          title: `${person.displayName}'s death anniversary`,
          personId: person.id,
          personName: person.displayName,
          deathDate: person.deathDate,
          happenedOn: person.deathDate!,
        })),
      ...events
        .filter((event) => event.happenedOn && event.kind !== "birth" && event.kind !== "death")
        .map((event) => ({
          id: event.id,
          kind: event.kind === "marriage" ? ("marriage" as const) : ("event" as const),
          title: event.title,
          personId: event.personId,
          personName: event.person.displayName,
          deathDate: event.person.deathDate,
          happenedOn: event.happenedOn!,
        })),
    ],
    role,
    from,
  );
  return { people, events, reminders, upcoming: upcomingReminders(reminders, 90) };
}

export async function loadOnThisDaySources(familyId: string) {
  const [people, events, documents, assets, stories] = await Promise.all([
    prisma.person.findMany({ where: { familyId } }),
    prisma.lifeEvent.findMany({ where: { familyId } }),
    prisma.document.findMany({ where: { familyId, kind: { in: ["letter", "note"] } } }),
    prisma.asset.findMany({ where: { familyId } }),
    prisma.story.findMany({ where: { familyId } }),
  ]);
  return { people, events, documents, assets, stories };
}
