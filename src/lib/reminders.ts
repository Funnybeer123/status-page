import { formatMonthDay } from "@/lib/dates";
import { isLiving, shouldHideLivingFacts } from "@/lib/privacy";
import { Role } from "@prisma/client";

export type ReminderKind = "birthday" | "death" | "marriage" | "event";

export type ReminderInput = {
  id: string;
  kind: ReminderKind;
  title: string;
  personId: string;
  personName: string;
  deathDate?: Date | string | null;
  happenedOn: Date;
};

export type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  personId: string;
  personName: string;
  originalOn: string;
  nextOn: string;
  monthDay: string;
  daysUntil: number;
  hideYear: boolean;
};

export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function nextOccurrence(happenedOn: Date, from: Date) {
  const month = happenedOn.getUTCMonth();
  const day = happenedOn.getUTCDate();
  const fromDay = startOfUtcDay(from);
  let year = fromDay.getUTCFullYear();
  let next = new Date(Date.UTC(year, month, day));
  if (month === 1 && day === 29 && next.getUTCMonth() !== 1) {
    next = new Date(Date.UTC(year, 1, 28));
  }
  if (next.getTime() < fromDay.getTime()) {
    year += 1;
    next = new Date(Date.UTC(year, month, day));
    if (month === 1 && day === 29 && next.getUTCMonth() !== 1) {
      next = new Date(Date.UTC(year, 1, 28));
    }
  }
  return next;
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / 86_400_000);
}

export function buildReminders(items: ReminderInput[], role: Role, from = new Date()) {
  const reminders: Reminder[] = [];
  for (const item of items) {
    const living = isLiving({ deathDate: item.deathDate });
    const hideYear = shouldHideLivingFacts(role, { deathDate: item.deathDate }) && item.kind === "birthday";
    if (shouldHideLivingFacts(role, { deathDate: item.deathDate }) && (item.kind === "birthday" || item.kind === "event")) {
      // Viewers still see living birthdays, but without the year or age.
    }
    if (shouldHideLivingFacts(role, { deathDate: item.deathDate }) && item.kind === "event") {
      continue;
    }
    const next = nextOccurrence(item.happenedOn, from);
    reminders.push({
      id: item.id,
      kind: item.kind,
      title: living && item.kind === "birthday" ? `Birthday · ${item.personName}` : item.title,
      personId: item.personId,
      personName: item.personName,
      originalOn: item.happenedOn.toISOString().slice(0, 10),
      nextOn: next.toISOString().slice(0, 10),
      monthDay: formatMonthDay(item.happenedOn),
      daysUntil: daysBetween(from, next),
      hideYear,
    });
  }
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || a.personName.localeCompare(b.personName));
}

export function upcomingReminders(reminders: Reminder[], withinDays = 90) {
  return reminders.filter((item) => item.daysUntil <= withinDays);
}

export function remindersThisWeek(reminders: Reminder[]) {
  return reminders.filter((item) => item.daysUntil <= 7);
}

export function remindersTomorrow(reminders: Reminder[]) {
  return reminders.filter((item) => item.daysUntil === 1);
}

export function remindersToday(reminders: Reminder[]) {
  return reminders.filter((item) => item.daysUntil === 0);
}

export function tomorrowHeading(count: number) {
  if (!count) return "No family date tomorrow";
  if (count === 1) return "Tomorrow’s family date";
  return `Tomorrow · ${count} family dates`;
}
