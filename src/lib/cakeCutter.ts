function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type CakeRow = {
  id: string;
  cutter: string;
  couple: string;
  wedding: string;
  cutOn?: Date | string | null;
};

export function cakeCutterLine(cutter?: string | null, couple?: string | null, wedding?: string | null, cutOn?: string | null) {
  const who = cutter?.trim() || "Someone";
  const pair = couple?.trim() || "the couple";
  const day = wedding?.trim() || "the wedding";
  const when = cutOn?.trim();
  const base = `${who} cut the cake for ${pair} · ${day}`;
  return when && when !== "9999-12-31" ? `${base} · ${when}` : base;
}

export function cakesHeading(count: number) {
  if (!count) return "No wedding-cake cutters yet";
  if (count === 1) return "1 wedding-cake cutter";
  return `${count} wedding-cake cutters`;
}

export function missingCakesHeading(count: number) {
  return count ? "No wedding-cake cutter has been written down" : "A wedding-cake cutter is already written down";
}

export function compileCakes(rows: CakeRow[]) {
  return [...rows]
    .map((row) => ({ ...row, cutKey: isoKey(row.cutOn) }))
    .sort((a, b) => a.cutKey.localeCompare(b.cutKey) || a.cutter.localeCompare(b.cutter));
}
