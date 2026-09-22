export type RodRow = {
  id: string;
  person: string;
  building: string;
  year?: number | null;
};

export function lightningRodLine(person?: string | null, building?: string | null, year?: number | null) {
  const who = person?.trim() || "An installer";
  const where = building?.trim() || "a building";
  const when = year != null ? String(year) : "";
  return when ? `${who} put rods on ${where} · ${when}` : `${who} put rods on ${where}`;
}

export function lightningRodsHeading(count: number) {
  if (!count) return "No lightning-rod installers yet";
  if (count === 1) return "1 lightning-rod installer";
  return `${count} lightning-rod installers`;
}

export function missingRodsHeading(count: number) {
  return count ? "No lightning-rod installer has been written down" : "A lightning-rod installer is already written down";
}

export function compileRods(rows: RodRow[]) {
  return [...rows].sort(
    (a, b) => a.building.localeCompare(b.building) || String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) || a.person.localeCompare(b.person),
  );
}
