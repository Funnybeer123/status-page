export type CrosswordSource = {
  id: string;
  title: string;
  kind: string;
  body: string;
  href: string;
};

export type CrosswordClue = {
  id: string;
  number: number;
  answer: string;
  clue: string;
  sourceTitle: string;
  href: string;
  kind: string;
};

const FAMILY_WORDS = [
  "cider",
  "cottonwoods",
  "cottonwood",
  "grange",
  "whitaker",
  "harvest",
  "rolls",
  "fiddle",
  "cedar",
  "hatband",
  "millinery",
  "bees",
];

function sentenceFor(body: string, word: string) {
  const parts = body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const match = parts.find((part) => new RegExp(`\\b${word}\\b`, "i").test(part));
  return match || parts[0] || body.replace(/\s+/g, " ").trim();
}

export function crosswordHeading(count: number) {
  if (!count) return "No family crossword yet";
  if (count === 1) return "Family crossword · 1 clue";
  return `Family crossword · ${count} clues`;
}

export function emptyCrosswordHeading() {
  return "No letters or stories to draw clues from";
}

export function crosswordCiteLine(sourceTitle: string) {
  return `Cited from ${sourceTitle}`;
}

export function crosswordBlank(answer: string) {
  return Array.from(answer)
    .map((ch) => (/[A-Z]/.test(ch) ? "_" : ch))
    .join(" ");
}

export function compileCrossword(sources: CrosswordSource[]): CrosswordClue[] {
  const clues: CrosswordClue[] = [];
  const used = new Set<string>();
  for (const source of sources) {
    const body = source.body || "";
    if (!body.trim()) continue;
    for (const word of FAMILY_WORDS) {
      if (!new RegExp(`\\b${word}\\b`, "i").test(body)) continue;
      const answer = word.toUpperCase();
      if (used.has(answer)) continue;
      used.add(answer);
      clues.push({
        id: `${source.id}-${answer.toLowerCase()}`,
        number: clues.length + 1,
        answer,
        clue: sentenceFor(body, word),
        sourceTitle: source.title,
        href: source.href,
        kind: source.kind,
      });
    }
  }
  return clues.slice(0, 12).map((clue, index) => ({ ...clue, number: index + 1 }));
}
