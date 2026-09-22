export type MoldRow = {
  id: string;
  person: string;
  mark: string;
};

export function butterMoldLine(person?: string | null, mark?: string | null) {
  const who = person?.trim() || "A churn";
  const stamp = mark?.trim() || "a mark";
  return `${who} · ${stamp}`;
}

export function moldsHeading(count: number) {
  if (!count) return "No butter-mold marks yet";
  if (count === 1) return "1 butter-mold mark";
  return `${count} butter-mold marks`;
}

export function missingMoldsHeading(count: number) {
  return count ? "No butter-mold mark has been written down" : "A butter-mold mark is already written down";
}

export function compileMolds(rows: MoldRow[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person) || a.mark.localeCompare(b.mark));
}
