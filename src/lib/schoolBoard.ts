function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function boardYears(startedOn?: Date | string | null, endedOn?: Date | string | null) {
  const start = isoKey(startedOn);
  const end = isoKey(endedOn);
  const startYear = start === "9999-12-31" ? "" : start.slice(0, 4);
  const endYear = end === "9999-12-31" ? "" : end.slice(0, 4);
  if (startYear && endYear) return `${startYear}–${endYear}`;
  return startYear || endYear;
}

export type BoardRow = {
  id: string;
  person: string;
  office: string;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
};

export function schoolBoardLine(person?: string | null, office?: string | null, years?: string | null) {
  const who = person?.trim() || "A member";
  const seat = office?.trim() || "the board";
  const when = years?.trim();
  return when ? `${who} · ${seat} · ${when}` : `${who} · ${seat}`;
}

export function schoolBoardsHeading(count: number) {
  if (!count) return "No school-board terms yet";
  if (count === 1) return "1 school-board term";
  return `${count} school-board terms`;
}

export function missingBoardsHeading(count: number) {
  return count ? "No school-board term has been written down" : "A school-board term is already written down";
}

export function compileBoards(rows: BoardRow[]) {
  return [...rows]
    .map((row) => ({ ...row, startKey: isoKey(row.startedOn) }))
    .sort((a, b) => a.startKey.localeCompare(b.startKey) || a.person.localeCompare(b.person));
}
