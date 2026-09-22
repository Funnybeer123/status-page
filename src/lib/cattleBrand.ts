function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function brandYears(startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const start = isoKey(startedOn);
  const end = isoKey(endedOn);
  const startYear = start === "9999-12-31" ? "" : start.slice(0, 4);
  const endYear = end === "9999-12-31" ? "" : end.slice(0, 4);
  if (startYear && endYear) return `${startYear}–${endYear}`;
  return startYear || endYear;
}

export type BrandRow = {
  id: string;
  person: string;
  mark: string;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
};

export function cattleBrandLine(mark?: string | null, person?: string | null, years?: string | null) {
  const brand = mark?.trim() || "A brand";
  const who = person?.trim() || "stock";
  const when = years?.trim();
  return when ? `${brand} · ${who} · ${when}` : `${brand} · ${who}`;
}

export function cattleBrandsHeading(count: number) {
  if (!count) return "No cattle brands yet";
  if (count === 1) return "1 cattle brand";
  return `${count} cattle brands`;
}

export function missingBrandsHeading(count: number) {
  return count ? "No cattle brand has been written down" : "A cattle brand is already written down";
}

export function compileBrands(rows: BrandRow[]) {
  return [...rows]
    .map((row) => ({ ...row, startKey: isoKey(row.startedOn) }))
    .sort((a, b) => a.startKey.localeCompare(b.startKey) || a.mark.localeCompare(b.mark) || a.person.localeCompare(b.person));
}
