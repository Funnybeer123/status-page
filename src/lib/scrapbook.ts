import { formatDate } from "@/lib/dates";

export const FIRST_TAGS = ["house", "car", "child", "job", "school"] as const;
export type FirstTag = (typeof FIRST_TAGS)[number];

export function scrapbookHeading(count: number) {
  if (!count) return "No firsts in the scrapbook yet";
  if (count === 1) return "1 first on the scrapbook page";
  return `${count} firsts on the scrapbook page`;
}

export function scrapbookLabel(tag?: string | null) {
  if (tag === "house") return "First house";
  if (tag === "car") return "First car";
  if (tag === "child") return "First child";
  if (tag === "job") return "First job";
  if (tag === "school") return "First school";
  return "A family first";
}

export function emptyScrapbookHeading() {
  return "The scrapbook is waiting for a first house, car, or child";
}

export function undatedFirstsHeading(count: number) {
  if (!count) return "Every first has a date";
  if (count === 1) return "1 first still needs a date";
  return `${count} firsts still need a date`;
}

export function peopleWithoutFirstsHeading(count: number) {
  if (!count) return "Every person has a first on the scrapbook";
  if (count === 1) return "1 person still needs a first";
  return `${count} people still need a first`;
}

function dateKey(value?: Date | string | null, fallback = "") {
  if (!value) return `9999-${fallback}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function isFirstTag(value?: string | null): value is FirstTag {
  return Boolean(value && (FIRST_TAGS as readonly string[]).includes(value));
}

export function compileScrapbook<
  T extends {
    id: string;
    title: string;
    firstTag?: string | null;
    happenedOn?: Date | string | null;
    person?: { id: string; displayName: string } | null;
    personId?: string;
  },
>(events: T[]) {
  return [...events]
    .filter((event) => isFirstTag(event.firstTag))
    .sort((a, b) => dateKey(a.happenedOn, a.title).localeCompare(dateKey(b.happenedOn, b.title)))
    .map((event) => ({
      id: event.id,
      tag: event.firstTag as FirstTag,
      label: scrapbookLabel(event.firstTag),
      title: event.title,
      when: formatDate(event.happenedOn, "Date unknown"),
      personName: event.person?.displayName || "",
      href: event.person?.id || event.personId ? `/people/${event.person?.id || event.personId}` : "/scrapbook",
    }));
}
