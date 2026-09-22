function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type VehicleRow = {
  id: string;
  name: string;
  kind: string;
  owner?: string | null;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
};

export function vehicleLine(name?: string | null, kind?: string | null, years?: string | null) {
  const title = name?.trim() || "A vehicle";
  const type = kind?.trim() || "vehicle";
  const span = years?.trim();
  return span ? `${title} · ${type} · ${span}` : `${title} · ${type}`;
}

export function vehicleYears(startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const start = startedOn ? isoKey(startedOn) : "";
  const end = endedOn ? isoKey(endedOn) : "";
  if (start && start !== "9999-12-31" && end && end !== "9999-12-31") return `${start.slice(0, 4)}–${end.slice(0, 4)}`;
  if (start && start !== "9999-12-31") return start.slice(0, 4);
  return "";
}

export function vehiclesHeading(count: number) {
  if (!count) return "No family vehicles yet";
  if (count === 1) return "1 family vehicle";
  return `${count} family vehicles`;
}

export function missingVehiclesHeading(count: number) {
  return count ? "The vehicle log is still empty" : "The vehicle log already has an entry";
}

export function compileVehicles(rows: VehicleRow[]) {
  return [...rows]
    .map((row) => ({
      ...row,
      years: vehicleYears(row.startedOn, row.endedOn),
      startKey: isoKey(row.startedOn),
    }))
    .sort((a, b) => a.startKey.localeCompare(b.startKey) || a.name.localeCompare(b.name));
}
