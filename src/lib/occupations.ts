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

function toTime(value?: Date | string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function occupationRange(startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const start = toTime(startedOn);
  const end = toTime(endedOn);
  if (start == null && end == null) return null;
  return { start: start ?? Number.NEGATIVE_INFINITY, end: end ?? Number.POSITIVE_INFINITY };
}

export function rangesOverlap(
  aStart?: Date | string | null,
  aEnd?: Date | string | null,
  bStart?: Date | string | null,
  bEnd?: Date | string | null,
) {
  const a = occupationRange(aStart, aEnd);
  const b = occupationRange(bStart, bEnd);
  if (!a || !b) return false;
  return a.start <= b.end && b.start <= a.end;
}

export function overlappingPairs<T extends { title: string; startedOn?: Date | string | null; endedOn?: Date | string | null }>(
  jobs: T[],
) {
  const pairs: { a: T; b: T; line: string }[] = [];
  for (let i = 0; i < jobs.length; i += 1) {
    for (let j = i + 1; j < jobs.length; j += 1) {
      const a = jobs[i];
      const b = jobs[j];
      if (!a || !b) continue;
      if (rangesOverlap(a.startedOn, a.endedOn, b.startedOn, b.endedOn)) {
        pairs.push({ a, b, line: overlapCallout(a.title, b.title) });
      }
    }
  }
  return pairs;
}

export function overlapCallout(first: string, second: string) {
  return `${first.trim() || "This job"} overlaps ${second.trim() || "another job"}`;
}

export function overlapHeading(count: number) {
  if (!count) return "No overlapping jobs on this timeline";
  if (count === 1) return "1 overlapping job on this timeline";
  return `${count} overlapping jobs on this timeline`;
}

export function familyOverlapsHeading(count: number) {
  if (!count) return "No overlapping jobs in the family";
  if (count === 1) return "1 person has overlapping jobs";
  return `${count} people have overlapping jobs`;
}
