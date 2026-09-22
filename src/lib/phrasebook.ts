export type PhraseRow = {
  id: string;
  phrase: string;
  meaning: string;
  language?: string | null;
  notes?: string | null;
};

export function phraseLine(phrase?: string | null, meaning?: string | null) {
  const saying = phrase?.trim() || "A family phrase";
  const gloss = meaning?.trim();
  return gloss ? `${saying} · ${gloss}` : saying;
}

export function phrasesHeading(count: number) {
  if (!count) return "No family phrases yet";
  if (count === 1) return "1 family phrase";
  return `${count} family phrases`;
}

export function missingPhrasesHeading(count: number) {
  return count ? "The phrasebook is still empty" : "The phrasebook already has a saying";
}

export function compilePhrases(rows: PhraseRow[]) {
  return [...rows].sort((a, b) => a.phrase.localeCompare(b.phrase));
}
