import { formatMonthDay } from "@/lib/dates";

export type MonthDateRow = {
  id: string;
  name: string;
  kind: "birthday" | "death" | "wedding";
  day: string;
  year?: string;
  href: string;
};

function monthOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCMonth();
}

function yearOf(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getUTCFullYear());
}

export function compileMonthDates(
  input: {
    people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[];
    marriages?: { id: string; title: string; happenedOn?: Date | string | null; personId?: string | null }[];
  },
  now: Date = new Date(),
): MonthDateRow[] {
  const month = now.getUTCMonth();
  const rows: MonthDateRow[] = [];
  for (const person of input.people) {
    if (monthOf(person.birthDate) === month) {
      rows.push({
        id: `${person.id}-birth`,
        name: person.displayName,
        kind: "birthday",
        day: formatMonthDay(person.birthDate),
        year: yearOf(person.birthDate),
        href: `/people/${person.id}`,
      });
    }
    if (monthOf(person.deathDate) === month) {
      rows.push({
        id: `${person.id}-death`,
        name: person.displayName,
        kind: "death",
        day: formatMonthDay(person.deathDate),
        year: yearOf(person.deathDate),
        href: `/people/${person.id}/memorial`,
      });
    }
  }
  for (const event of input.marriages ?? []) {
    if (monthOf(event.happenedOn) === month) {
      rows.push({
        id: event.id,
        name: event.title,
        kind: "wedding",
        day: formatMonthDay(event.happenedOn),
        year: yearOf(event.happenedOn),
        href: event.personId ? `/people/${event.personId}` : "/marriages",
      });
    }
  }
  return rows.sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name));
}
