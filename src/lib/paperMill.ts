export type PaperRow = {
  id: string;
  title: string;
  paperMill?: string | null;
};

export function hasPaperMill(letter?: { paperMill?: string | null }) {
  return Boolean(letter?.paperMill?.trim());
}

export function paperMillLine(mill?: string | null) {
  const name = mill?.trim();
  return name ? `Paper mill · ${name}` : "Paper mill unknown";
}

export function paperHeading(count: number) {
  if (!count) return "No letter paper mills yet";
  if (count === 1) return "1 letter with a paper mill";
  return `${count} letters with a paper mill`;
}

export function missingPaperHeading(count: number) {
  if (!count) return "Every letter already names its paper mill";
  if (count === 1) return "1 letter still needs a paper mill";
  return `${count} letters still need a paper mill`;
}

export function compilePaperMills(rows: PaperRow[]) {
  return rows
    .filter(hasPaperMill)
    .map((row) => ({ ...row, line: paperMillLine(row.paperMill) }))
    .sort((a, b) => (a.paperMill || "").localeCompare(b.paperMill || "") || a.title.localeCompare(b.title));
}
