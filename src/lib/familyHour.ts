import { formatDate } from "@/lib/dates";

export function utcDateKey(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function isUpcoming(when?: Date | string | null, from = new Date()) {
  const key = utcDateKey(when);
  return Boolean(key && key >= utcDateKey(from));
}

export function daysUntil(when?: Date | string | null, from = new Date()) {
  const key = utcDateKey(when);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  const target = Date.UTC(year!, (month || 1) - 1, day || 1);
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((target - start) / 86_400_000);
}

export function countdownLine(title?: string | null, when?: Date | string | null, from = new Date()) {
  const name = title?.trim() || "The next family hour";
  const days = daysUntil(when, from);
  if (days == null) return name;
  if (days < 0) return `${name} · already happened`;
  if (days === 0) return `${name} · today`;
  if (days === 1) return `${name} · tomorrow`;
  return `${name} · ${days} days`;
}

export function familyHourHeading(title?: string | null, when?: Date | string | null) {
  if (!title) return "No family hour on the calendar";
  return `Family hour · ${title.trim()} · ${formatDate(when, "Date unknown")}`;
}

export function emptyHourHeading() {
  return "Nothing on the family hour yet";
}

export function pastHourHeading(count: number) {
  if (!count) return "No past reunions or interviews";
  if (count === 1) return "1 past reunion or interview";
  return `${count} past reunions and interviews`;
}

export function missingInterviewHeading(count: number) {
  if (!count) return "Everyone who still needs an interview has a date";
  if (count === 1) return "1 interview still needs a date";
  return `${count} interviews still need a date`;
}

export type HourEvent = {
  id: string;
  kind: "reunion" | "interview";
  title: string;
  happenedOn: Date | string;
  href: string;
};

export function compileFamilyHour(events: HourEvent[], from = new Date()) {
  const upcoming = events
    .filter((event) => isUpcoming(event.happenedOn, from))
    .sort((a, b) => utcDateKey(a.happenedOn).localeCompare(utcDateKey(b.happenedOn)) || a.title.localeCompare(b.title));
  const next = upcoming[0] || null;
  return {
    next,
    upcoming,
    heading: next ? familyHourHeading(next.title, next.happenedOn) : emptyHourHeading(),
    line: next ? countdownLine(next.title, next.happenedOn, from) : emptyHourHeading(),
  };
}

export function compilePastHour(events: HourEvent[], from = new Date()) {
  return events
    .filter((event) => !isUpcoming(event.happenedOn, from))
    .sort((a, b) => utcDateKey(b.happenedOn).localeCompare(utcDateKey(a.happenedOn)) || a.title.localeCompare(b.title));
}
