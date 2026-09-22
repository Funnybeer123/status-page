import { formatYear } from "@/lib/dates";

export type HomeStay = {
  personId: string;
  name: string;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
};

function yearOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

export function stayedInYear(stay: HomeStay, year: number) {
  const start = yearOf(stay.startedOn);
  const end = yearOf(stay.endedOn);
  if (start != null && year < start) return false;
  if (end != null && year > end) return false;
  return start != null || end != null || Boolean(stay.startedOn || stay.endedOn);
}

export function occupancyByYear(stays: HomeStay[], from?: number, to?: number) {
  const years = stays.flatMap((stay) => [yearOf(stay.startedOn), yearOf(stay.endedOn)]).filter((year): year is number => year != null);
  const openEnded = stays.some((stay) => yearOf(stay.startedOn) != null && yearOf(stay.endedOn) == null);
  const start = from ?? (years.length ? Math.min(...years) : new Date().getUTCFullYear());
  const end = to ?? (openEnded ? new Date().getUTCFullYear() : years.length ? Math.max(...years) : start);
  const rows: { year: number; people: { id: string; name: string }[] }[] = [];
  for (let year = start; year <= end; year += 1) {
    const people = stays
      .filter((stay) => stayedInYear(stay, year))
      .map((stay) => ({ id: stay.personId, name: stay.name }))
      .filter((person, index, list) => list.findIndex((row) => row.id === person.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));
    rows.push({ year, people });
  }
  return rows;
}

export function collapseOccupancy(rows: { year: number; people: { id: string; name: string }[] }[]) {
  const spans: { from: number; to: number; people: { id: string; name: string }[] }[] = [];
  for (const row of rows) {
    const last = spans[spans.length - 1];
    const key = row.people.map((person) => person.id).join(",");
    const lastKey = last?.people.map((person) => person.id).join(",");
    if (last && last.to + 1 === row.year && key === lastKey) {
      last.to = row.year;
    } else {
      spans.push({ from: row.year, to: row.year, people: row.people });
    }
  }
  return spans;
}

export function occupancyGaps(rows: { year: number; people: { id: string; name: string }[] }[]) {
  return rows.filter((row) => !row.people.length).map((row) => row.year);
}

export function occupancySpanLine(span: { from: number; to: number; people: { id: string; name: string }[] }) {
  const names = span.people.map((person) => person.name).join(", ") || "No one recorded";
  return span.from === span.to ? `${span.from} · ${names}` : `${span.from}–${span.to} · ${names}`;
}

export function occupancyGapHeading(title: string, count: number) {
  if (!count) return `No empty years at ${title}`;
  if (count === 1) return `1 empty year at ${title}`;
  return `${count} empty years at ${title}`;
}

export function occupancyHeading(title: string) {
  return `Who lived at ${title}, year by year`;
}

export function stayLine(name: string, startedOn?: Date | string | null, endedOn?: Date | string | null) {
  return `${name} · ${formatYear(startedOn) || "?"}–${formatYear(endedOn) || ""}`;
}
