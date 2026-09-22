function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type RecitalRow = {
  id: string;
  person: string;
  piece: string;
  kind: string;
  heldOn?: Date | string | null;
  place?: string | null;
};

export function christmasPartLine(person?: string | null, kind?: string | null, piece?: string | null, heldOn?: string | null) {
  const who = person?.trim() || "A child";
  const did = (kind?.trim() || "recited").toLowerCase();
  const what = piece?.trim() || "a piece";
  const day = heldOn?.trim();
  const base = `${who} ${did} ${what}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function recitalsHeading(count: number) {
  if (!count) return "No Christmas-program parts yet";
  if (count === 1) return "1 Christmas-program part";
  return `${count} Christmas-program parts`;
}

export function missingRecitalsHeading(count: number) {
  return count ? "No Christmas-program part has been written down" : "A Christmas-program part is already written down";
}

export function compileRecitals(rows: RecitalRow[]) {
  return [...rows]
    .map((row) => ({ ...row, heldKey: isoKey(row.heldOn) }))
    .sort((a, b) => a.heldKey.localeCompare(b.heldKey) || a.person.localeCompare(b.person) || a.piece.localeCompare(b.piece));
}
