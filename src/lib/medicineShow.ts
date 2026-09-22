function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type ShowRow = {
  id: string;
  person: string;
  item: string;
  show: string;
  boughtOn?: Date | string | null;
};

export function medicineShowLine(person?: string | null, item?: string | null, show?: string | null, boughtOn?: string | null) {
  const who = person?.trim() || "A neighbor";
  const what = item?.trim() || "a tonic";
  const where = show?.trim() || "the medicine show";
  const day = boughtOn?.trim();
  const base = `${who} bought ${what} at ${where}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function showsHeading(count: number) {
  if (!count) return "No medicine-show purchases yet";
  if (count === 1) return "1 medicine-show purchase";
  return `${count} medicine-show purchases`;
}

export function missingShowsHeading(count: number) {
  return count ? "No medicine-show purchase has been written down" : "A medicine-show purchase is already written down";
}

export function compileShows(rows: ShowRow[]) {
  return [...rows]
    .map((row) => ({ ...row, buyKey: isoKey(row.boughtOn) }))
    .sort((a, b) => a.buyKey.localeCompare(b.buyKey) || a.person.localeCompare(b.person));
}
