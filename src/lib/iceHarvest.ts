export type IceRow = {
  id: string;
  person: string;
  year: number;
  place?: string | null;
  role?: string | null;
};

export function iceHarvestLine(person?: string | null, year?: number | null, role?: string | null) {
  const who = person?.trim() || "A crew member";
  const when = year != null ? String(year) : "year unknown";
  const part = role?.trim();
  return part ? `${who} · ${part} · ${when}` : `${who} · ${when}`;
}

export function iceHarvestHeading(count: number) {
  if (!count) return "No ice-harvest crew yet";
  if (count === 1) return "1 ice-harvest crew record";
  return `${count} ice-harvest crew records`;
}

export function missingIceHeading(count: number) {
  return count ? "The ice-harvest crew list is still empty" : "The ice-harvest crew is already listed";
}

export function compileIceHarvest(rows: IceRow[]) {
  return [...rows].sort((a, b) => a.year - b.year || a.person.localeCompare(b.person));
}
