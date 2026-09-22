export type WellRow = {
  id: string;
  person: string;
  place: string;
  depth: string;
  year?: number | null;
};

export function wellLine(person?: string | null, place?: string | null, depth?: string | null, year?: number | null) {
  const who = person?.trim() || "A digger";
  const where = place?.trim() || "a well";
  const how = depth?.trim() || "depth unknown";
  const when = year != null ? String(year) : "";
  return when ? `${who} dug ${where} · ${how} · ${when}` : `${who} dug ${where} · ${how}`;
}

export function wellsHeading(count: number) {
  if (!count) return "No wells recorded yet";
  if (count === 1) return "1 well";
  return `${count} wells`;
}

export function missingWellsHeading(count: number) {
  return count ? "No well has been written down" : "A well is already written down";
}

export function compileWells(rows: WellRow[]) {
  return [...rows].sort(
    (a, b) => a.place.localeCompare(b.place) || String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) || a.person.localeCompare(b.person),
  );
}
