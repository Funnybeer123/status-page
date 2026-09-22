import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { buildReminders, remindersThisWeek, upcomingReminders } from "@/lib/reminders";

function ReminderList({
  items,
}: {
  items: { id: string; title: string; personId: string; monthDay: string; daysUntil: number; hideYear: boolean; nextOn: string }[];
}) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
          <div>
            <Link href={`/people/${item.personId}`} className="font-display text-xl text-seal">{item.title}</Link>
            <p className="font-sans text-sm text-bark">
              {item.monthDay}
              {item.hideYear ? "" : ` · next ${item.nextOn}`}
            </p>
          </div>
          <span className="font-sans text-sm text-gold">
            {item.daysUntil === 0 ? "Today" : item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`}
          </span>
        </li>
      ))}
      {!items.length ? <li className="text-bark">None in this window.</li> : null}
    </ul>
  );
}

export default async function DatesPage() {
  const ctx = await requireFamily();
  const [people, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, happenedOn: { not: null } },
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
    ctx.role,
  );

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="dates-heading">Family dates</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Birthdays, death anniversaries, marriages, and the other dated events the archive already knows.
      </p>
      <a href="/api/dates/ics" className="mt-4 inline-block rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" data-testid="ics-download">
        Download calendar (.ics)
      </a>
      <section className="mt-10">
        <h2 className="font-display text-2xl">This week</h2>
        <ReminderList items={remindersThisWeek(reminders)} />
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Coming up</h2>
        <ReminderList items={upcomingReminders(reminders, 90)} />
      </section>
    </AppShell>
  );
}
