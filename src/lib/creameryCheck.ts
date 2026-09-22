function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type CreameryRow = {
  id: string;
  person: string;
  pounds: string;
  amount: string;
  paidOn?: Date | string | null;
};

export function creameryLine(person?: string | null, pounds?: string | null, amount?: string | null, paidOn?: string | null) {
  const who = person?.trim() || "A farm";
  const weight = pounds?.trim() || "cream";
  const paid = amount?.trim() || "amount unknown";
  const day = paidOn?.trim();
  return day && day !== "9999-12-31" ? `${who} · ${weight} · ${paid} · ${day}` : `${who} · ${weight} · ${paid}`;
}

export function creameryHeading(count: number) {
  if (!count) return "No creamery checks yet";
  if (count === 1) return "1 creamery check";
  return `${count} creamery checks`;
}

export function missingCreameryHeading(count: number) {
  return count ? "No creamery check has been written down" : "A creamery check is already written down";
}

export function compileCreamery(rows: CreameryRow[]) {
  return [...rows]
    .map((row) => ({ ...row, paidKey: isoKey(row.paidOn) }))
    .sort((a, b) => a.paidKey.localeCompare(b.paidKey) || a.person.localeCompare(b.person));
}
