export type RoadTaxRow = {
  id: string;
  person: string;
  road: string;
  days: number;
  year?: number | null;
};

export function roadTaxLine(person?: string | null, road?: string | null, days?: number | null, year?: number | null) {
  const who = person?.trim() || "A worker";
  const which = road?.trim() || "a road";
  const how = days != null ? `${days} ${days === 1 ? "day" : "days"}` : "days unknown";
  const when = year != null ? String(year) : "";
  return when ? `${who} worked ${how} on ${which} · ${when}` : `${who} worked ${how} on ${which}`;
}

export function roadTaxesHeading(count: number) {
  if (!count) return "No road-tax days yet";
  if (count === 1) return "1 road-tax record";
  return `${count} road-tax records`;
}

export function missingRoadTaxesHeading(count: number) {
  return count ? "No road-tax days have been written down" : "Road-tax days are already written down";
}

export function compileRoadTaxes(rows: RoadTaxRow[]) {
  return [...rows].sort(
    (a, b) =>
      String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) ||
      a.road.localeCompare(b.road) ||
      a.person.localeCompare(b.person),
  );
}
