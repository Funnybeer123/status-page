import { formatYear } from "@/lib/dates";

export function occupationTimelineHeading(name: string, count: number) {
  const who = name.trim() || "This person";
  if (!count) return `No occupations recorded for ${who}`;
  if (count === 1) return `1 occupation on ${who}'s timeline`;
  return `${count} occupations on ${who}'s timeline`;
}

export function occupationLine(title: string, employer?: string | null, startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const years =
    startedOn || endedOn ? `${formatYear(startedOn) || "?"}–${formatYear(endedOn) || ""}` : "";
  return [title.trim() || "Work", employer?.trim(), years].filter(Boolean).join(" · ");
}

export function sortOccupations<T extends { startedOn?: Date | string | null; createdAt?: Date | string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aKey = a.startedOn ? String(a.startedOn) : `~${a.createdAt || ""}`;
    const bKey = b.startedOn ? String(b.startedOn) : `~${b.createdAt || ""}`;
    return aKey.localeCompare(bKey);
  });
}

export function missingOccupationsHeading(count: number) {
  if (!count) return "Every adult has an occupation on the timeline";
  if (count === 1) return "1 person still needs an occupation";
  return `${count} people still need an occupation`;
}

export function occupationTimelinesHeading(count: number) {
  if (!count) return "No occupation timelines yet";
  if (count === 1) return "1 occupation timeline";
  return `${count} occupation timelines`;
}
