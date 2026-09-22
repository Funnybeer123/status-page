export type SpellingRow = {
  id: string;
  surname: string;
  variant: string;
  source?: string | null;
};

export function spellingLine(surname?: string | null, variant?: string | null, source?: string | null) {
  const name = surname?.trim() || "A surname";
  const other = variant?.trim() || "a variant";
  const from = source?.trim();
  return from ? `${name} also written ${other} · ${from}` : `${name} also written ${other}`;
}

export function spellingsHeading(count: number) {
  if (!count) return "No surname spellings yet";
  if (count === 1) return "1 surname spelling variant";
  return `${count} surname spelling variants`;
}

export function missingSpellingsHeading(count: number) {
  return count ? "No surname variants have been recorded" : "Surname variants are already recorded";
}

export function compileSpellings(rows: SpellingRow[]) {
  return [...rows].sort((a, b) => a.surname.localeCompare(b.surname) || a.variant.localeCompare(b.variant));
}
