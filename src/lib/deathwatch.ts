function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type WatchRow = {
  id: string;
  deceased: string;
  sitter: string;
  deceasedId: string;
  personId: string;
  watchedOn?: Date | string | null;
};

export function deathwatchLine(sitter?: string | null, deceased?: string | null, watchedOn?: string | null) {
  const who = sitter?.trim() || "A watcher";
  const forWhom = deceased?.trim() || "the night";
  const when = watchedOn?.trim();
  return when && when !== "9999-12-31" ? `${who} sat with ${forWhom} · ${when}` : `${who} sat with ${forWhom}`;
}

export function deathwatchesHeading(count: number) {
  if (!count) return "No deathwatch sitters yet";
  if (count === 1) return "1 deathwatch sitter";
  return `${count} deathwatch sitters`;
}

export function missingWatchesHeading(count: number) {
  if (!count) return "Every funeral already has a deathwatch";
  if (count === 1) return "1 funeral still needs a deathwatch";
  return `${count} funerals still need a deathwatch`;
}

export function compileDeathwatches(rows: WatchRow[]) {
  return [...rows]
    .map((row) => ({ ...row, watchKey: isoKey(row.watchedOn) }))
    .sort((a, b) => a.deceased.localeCompare(b.deceased) || a.watchKey.localeCompare(b.watchKey) || a.sitter.localeCompare(b.sitter));
}
