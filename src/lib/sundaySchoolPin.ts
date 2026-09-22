export type PinRow = {
  id: string;
  person: string;
  year: number;
  church?: string | null;
};

export function sundayPinLine(person?: string | null, year?: number | null, church?: string | null) {
  const who = person?.trim() || "A pupil";
  const when = year != null ? String(year) : "year unknown";
  const house = church?.trim();
  return house ? `${who} · ${house} · ${when}` : `${who} · ${when}`;
}

export function sundayPinsHeading(count: number) {
  if (!count) return "No Sunday-school pins yet";
  if (count === 1) return "1 Sunday-school pin";
  return `${count} Sunday-school pins`;
}

export function missingPinsHeading(count: number) {
  return count ? "No Sunday-school pin has been written down" : "A Sunday-school pin is already written down";
}

export function compileSundayPins(rows: PinRow[]) {
  return [...rows].sort((a, b) => a.year - b.year || a.person.localeCompare(b.person));
}
