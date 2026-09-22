import { sameMonthDay } from "@/lib/onThisDay";
import { formatDate, formatYear } from "@/lib/dates";

export function sameDayHeading(name?: string | null, from = new Date()) {
  const who = name?.trim() || "This person";
  const day = formatDate(from.toISOString().slice(0, 10)).replace(/ \d{4}$/, "");
  return `Same day in history · ${who} · ${day}`;
}

export function emptySameDayHeading(name?: string | null) {
  const who = name?.trim() || "This person";
  return `Nothing on this day in ${who}'s archive`;
}

export function missingSameDayHeading(count: number) {
  if (!count) return "Everyone has something on this day";
  if (count === 1) return "1 person has nothing on this day";
  return `${count} people have nothing on this day`;
}

export function familySameDayHeading(count: number, from = new Date()) {
  const day = formatDate(from.toISOString().slice(0, 10)).replace(/ \d{4}$/, "");
  if (!count) return `Nobody has something on ${day}`;
  if (count === 1) return `1 person has something on ${day}`;
  return `${count} people have something on ${day}`;
}

export function compileSameDay<
  T extends { id: string; title: string; happenedOn?: Date | string | null; href: string; kind?: string },
>(items: T[], from = new Date()) {
  return items
    .filter((item) => sameMonthDay(item.happenedOn, from))
    .sort((a, b) => {
      const left = a.happenedOn ? new Date(a.happenedOn).toISOString() : "9999-";
      const right = b.happenedOn ? new Date(b.happenedOn).toISOString() : "9999-";
      return left.localeCompare(right) || a.title.localeCompare(b.title);
    })
    .map((item) => ({
      ...item,
      year: formatYear(item.happenedOn),
    }));
}
