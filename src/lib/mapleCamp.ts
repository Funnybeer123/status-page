export type MapleRow = {
  id: string;
  person: string;
  gallons: string;
  year?: number | null;
  place?: string | null;
};

export function mapleCampLine(person?: string | null, gallons?: string | null, place?: string | null, year?: number | null) {
  const who = person?.trim() || "A boiler";
  const how = gallons?.trim() || "gallons unknown";
  const where = place?.trim();
  const when = year != null ? String(year) : "";
  const base = where ? `${who} boiled ${how} · ${where}` : `${who} boiled ${how}`;
  return when ? `${base} · ${when}` : base;
}

export function mapleCampsHeading(count: number) {
  if (!count) return "No maple-sugar camps yet";
  if (count === 1) return "1 maple-sugar camp";
  return `${count} maple-sugar camps`;
}

export function missingMapleHeading(count: number) {
  return count ? "No maple-sugar camp has been written down" : "A maple-sugar camp is already written down";
}

export function compileMaple(rows: MapleRow[]) {
  return [...rows].sort(
    (a, b) => String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) || a.person.localeCompare(b.person),
  );
}
