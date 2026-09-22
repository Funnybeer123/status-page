function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type FenceRow = {
  id: string;
  person: string;
  neighbors: string;
  walkedOn?: Date | string | null;
};

export function fenceViewerLine(person?: string | null, neighbors?: string | null, walkedOn?: string | null) {
  const who = person?.trim() || "A viewer";
  const line = neighbors?.trim() || "the neighbors";
  const day = walkedOn?.trim();
  return day && day !== "9999-12-31" ? `${who} walked the line for ${line} · ${day}` : `${who} walked the line for ${line}`;
}

export function fenceViewersHeading(count: number) {
  if (!count) return "No fence-viewer appointments yet";
  if (count === 1) return "1 fence-viewer appointment";
  return `${count} fence-viewer appointments`;
}

export function missingFencesHeading(count: number) {
  return count ? "No fence-viewer appointment has been written down" : "A fence-viewer appointment is already written down";
}

export function compileFences(rows: FenceRow[]) {
  return [...rows]
    .map((row) => ({ ...row, walkKey: isoKey(row.walkedOn) }))
    .sort((a, b) => a.walkKey.localeCompare(b.walkKey) || a.person.localeCompare(b.person));
}
