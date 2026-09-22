export type ThreshingRow = {
  id: string;
  person: string;
  year: number;
  place?: string | null;
  role?: string | null;
};

export function threshingLine(person?: string | null, year?: number | null, role?: string | null) {
  const who = person?.trim() || "A neighbor";
  const when = year != null ? String(year) : "year unknown";
  const part = role?.trim();
  return part ? `${who} · ${part} · ${when}` : `${who} · ${when}`;
}

export function threshingHeading(count: number) {
  if (!count) return "No threshing ring yet";
  if (count === 1) return "1 threshing-ring record";
  return `${count} threshing-ring records`;
}

export function missingThreshingHeading(count: number) {
  return count ? "The threshing ring is still empty" : "The threshing ring is already listed";
}

export function compileThreshing(rows: ThreshingRow[]) {
  return [...rows].sort((a, b) => a.year - b.year || a.person.localeCompare(b.person));
}
