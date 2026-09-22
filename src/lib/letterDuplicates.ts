export type LetterRow = {
  id: string;
  title: string;
  writtenAt?: Date | string | null;
  transcript: string;
  personIds: string[];
};

export type LetterDuplicate = {
  keepId: string;
  dropId: string;
  keepTitle: string;
  dropTitle: string;
  reason: "same people and date" | "nearly the same text";
  score: number;
};

function isoDay(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function letterTokens(text: string) {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2))];
}

export function textOverlap(a: string, b: string) {
  const left = letterTokens(a);
  const right = new Set(letterTokens(b));
  if (!left.length || !right.size) return 0;
  const shared = left.filter((token) => right.has(token)).length;
  return shared / Math.max(left.length, right.size);
}

function samePeople(a: string[], b: string[]) {
  if (!a.length || !b.length) return false;
  const left = [...a].sort().join(",");
  const right = [...b].sort().join(",");
  return left === right;
}

export function suggestLetterDuplicates(letters: LetterRow[], textThreshold = 0.72): LetterDuplicate[] {
  const pairs: LetterDuplicate[] = [];
  for (let i = 0; i < letters.length; i += 1) {
    for (let j = i + 1; j < letters.length; j += 1) {
      const a = letters[i]!;
      const b = letters[j]!;
      const dayA = isoDay(a.writtenAt);
      const dayB = isoDay(b.writtenAt);
      if (dayA && dayA === dayB && samePeople(a.personIds, b.personIds)) {
        pairs.push({
          keepId: a.id,
          dropId: b.id,
          keepTitle: a.title,
          dropTitle: b.title,
          reason: "same people and date",
          score: 100,
        });
        continue;
      }
      const score = Math.round(textOverlap(a.transcript, b.transcript) * 100);
      if (score >= textThreshold * 100) {
        pairs.push({
          keepId: a.id,
          dropId: b.id,
          keepTitle: a.title,
          dropTitle: b.title,
          reason: "nearly the same text",
          score,
        });
      }
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

export function letterDuplicateHeading(count: number) {
  if (!count) return "No duplicate letters";
  if (count === 1) return "1 possible duplicate letter";
  return `${count} possible duplicate letters`;
}
