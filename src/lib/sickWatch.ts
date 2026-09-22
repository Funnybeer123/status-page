function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type SickRow = {
  id: string;
  sitter: string;
  sick: string;
  sickId: string;
  personId: string;
  satOn?: Date | string | null;
};

export function sickWatchLine(sitter?: string | null, sick?: string | null, satOn?: string | null) {
  const who = sitter?.trim() || "A sitter";
  const forWhom = sick?.trim() || "the sick";
  const day = satOn?.trim();
  return day && day !== "9999-12-31" ? `${who} sat up with ${forWhom} · ${day}` : `${who} sat up with ${forWhom}`;
}

export function sickWatchesHeading(count: number) {
  if (!count) return "No sick-watch sitters yet";
  if (count === 1) return "1 sick-watch sitter";
  return `${count} sick-watch sitters`;
}

export function missingSickHeading(count: number) {
  return count ? "No sick-watch has been written down" : "A sick-watch is already written down";
}

export function compileSickWatches(rows: SickRow[]) {
  return [...rows]
    .map((row) => ({ ...row, satKey: isoKey(row.satOn) }))
    .sort((a, b) => a.sick.localeCompare(b.sick) || a.satKey.localeCompare(b.satKey) || a.sitter.localeCompare(b.sitter));
}
