function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function districtYears(startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const start = isoKey(startedOn);
  const end = isoKey(endedOn);
  const startYear = start === "9999-12-31" ? "" : start.slice(0, 4);
  const endYear = end === "9999-12-31" ? "" : end.slice(0, 4);
  if (startYear && endYear) return `${startYear}–${endYear}`;
  return startYear || endYear;
}

export type DistrictRow = {
  id: string;
  person: string;
  district: string;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
};

export function roadDistrictLine(person?: string | null, district?: string | null, years?: string | null) {
  const who = person?.trim() || "An overseer";
  const which = district?.trim() || "the district";
  const when = years?.trim();
  return when ? `${who} · ${which} · ${when}` : `${who} · ${which}`;
}

export function roadDistrictsHeading(count: number) {
  if (!count) return "No township road districts yet";
  if (count === 1) return "1 township road district";
  return `${count} township road districts`;
}

export function missingDistrictsHeading(count: number) {
  return count ? "No township road district has been written down" : "A township road district is already written down";
}

export function compileDistricts(rows: DistrictRow[]) {
  return [...rows]
    .map((row) => ({ ...row, startKey: isoKey(row.startedOn) }))
    .sort((a, b) => a.startKey.localeCompare(b.startKey) || a.district.localeCompare(b.district) || a.person.localeCompare(b.person));
}
