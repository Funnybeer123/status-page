function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type BellRow = {
  id: string;
  person: string;
  service: string;
  rangOn?: Date | string | null;
};

export function churchBellLine(person?: string | null, service?: string | null, rangOn?: string | null) {
  const who = person?.trim() || "A ringer";
  const when = service?.trim() || "a service";
  const day = rangOn?.trim();
  return day && day !== "9999-12-31" ? `${who} rang for ${when} · ${day}` : `${who} rang for ${when}`;
}

export function churchBellsHeading(count: number) {
  if (!count) return "No church-bell ringers yet";
  if (count === 1) return "1 church-bell ringing";
  return `${count} church-bell ringings`;
}

export function missingBellsHeading(count: number) {
  return count ? "No one has been written as ringing the bell" : "The church-bell roll already has a ringer";
}

export function compileBells(rows: BellRow[]) {
  return [...rows]
    .map((row) => ({ ...row, rangKey: isoKey(row.rangOn) }))
    .sort((a, b) => a.rangKey.localeCompare(b.rangKey) || a.person.localeCompare(b.person));
}
