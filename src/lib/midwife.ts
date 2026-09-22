function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type MidwifeRow = {
  id: string;
  midwife: string;
  mother: string;
  child?: string | null;
  attendedOn?: Date | string | null;
};

export function midwifeLine(midwife?: string | null, mother?: string | null, child?: string | null, attendedOn?: string | null) {
  const who = midwife?.trim() || "A midwife";
  const mom = mother?.trim() || "a mother";
  const baby = child?.trim();
  const day = attendedOn?.trim();
  const base = baby ? `${who} attended ${mom} · ${baby}` : `${who} attended ${mom}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function midwivesHeading(count: number) {
  if (!count) return "No midwives recorded yet";
  if (count === 1) return "1 midwife record";
  return `${count} midwife records`;
}

export function missingMidwivesHeading(count: number) {
  return count ? "No midwife has been written down" : "A midwife is already written down";
}

export function compileMidwives(rows: MidwifeRow[]) {
  return [...rows]
    .map((row) => ({ ...row, attendKey: isoKey(row.attendedOn) }))
    .sort((a, b) => a.attendKey.localeCompare(b.attendKey) || a.mother.localeCompare(b.mother));
}
