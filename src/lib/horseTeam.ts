function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type HorseTeamRow = {
  id: string;
  lender: string;
  borrower: string;
  purpose: string;
  loanedOn?: Date | string | null;
};

export function horseTeamLine(lender?: string | null, borrower?: string | null, purpose?: string | null, loanedOn?: string | null) {
  const from = lender?.trim() || "A neighbor";
  const to = borrower?.trim() || "a neighbor";
  const forWhat = purpose?.trim() || "the work";
  const day = loanedOn?.trim();
  const base = `${from} loaned the team to ${to} for ${forWhat}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function horseTeamsHeading(count: number) {
  if (!count) return "No horse-team loans yet";
  if (count === 1) return "1 horse-team loan";
  return `${count} horse-team loans`;
}

export function missingTeamsHeading(count: number) {
  return count ? "No horse-team loan has been written down" : "A horse-team loan is already written down";
}

export function compileHorseTeams(rows: HorseTeamRow[]) {
  return [...rows]
    .map((row) => ({ ...row, loanKey: isoKey(row.loanedOn) }))
    .sort((a, b) => a.loanKey.localeCompare(b.loanKey) || a.lender.localeCompare(b.lender));
}
