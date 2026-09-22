export type SorghumRow = {
  id: string;
  person: string;
  gallons: string;
  year?: number | null;
  place?: string | null;
};

export function sorghumLine(person?: string | null, gallons?: string | null, place?: string | null, year?: number | null) {
  const who = person?.trim() || "A boiler";
  const how = gallons?.trim() || "gallons unknown";
  const where = place?.trim();
  const when = year != null ? String(year) : "";
  const base = where ? `${who} boiled ${how} · ${where}` : `${who} boiled ${how}`;
  return when ? `${base} · ${when}` : base;
}

export function sorghumHeading(count: number) {
  if (!count) return "No sorghum boilings yet";
  if (count === 1) return "1 sorghum boiling";
  return `${count} sorghum boilings`;
}

export function missingSorghumHeading(count: number) {
  return count ? "No sorghum boiling has been written down" : "A sorghum boiling is already written down";
}

export function compileSorghum(rows: SorghumRow[]) {
  return [...rows].sort(
    (a, b) => String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) || a.person.localeCompare(b.person),
  );
}
