function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type StrayRow = {
  id: string;
  person: string;
  animal: string;
  postedOn?: Date | string | null;
  place?: string | null;
};

export function strayNoticeLine(person?: string | null, animal?: string | null, postedOn?: string | null) {
  const who = person?.trim() || "A neighbor";
  const what = animal?.trim() || "a stray";
  const day = postedOn?.trim();
  const base = `${who} posted ${what}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function straysHeading(count: number) {
  if (!count) return "No stray-animal notices yet";
  if (count === 1) return "1 stray-animal notice";
  return `${count} stray-animal notices`;
}

export function missingStraysHeading(count: number) {
  return count ? "No stray-animal notice has been written down" : "A stray-animal notice is already written down";
}

export function compileStrays(rows: StrayRow[]) {
  return [...rows]
    .map((row) => ({ ...row, postKey: isoKey(row.postedOn) }))
    .sort((a, b) => a.postKey.localeCompare(b.postKey) || a.person.localeCompare(b.person));
}
