import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { buildReminders, remindersThisWeek, upcomingReminders } from "@/lib/reminders";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, happenedOn: { not: null } },
      include: { person: true, otherPerson: true },
    }),
  ]);
  const items = [
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
  ];
  const reminders = buildReminders(items, ctx.role);
  return NextResponse.json({
    reminders,
    thisWeek: remindersThisWeek(reminders),
    upcoming: upcomingReminders(reminders, 90),
  });
}
