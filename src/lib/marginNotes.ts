export type MarginNoteRow = {
  id: string;
  line: number;
  body: string;
  author: string;
};

export function letterLines(transcript?: string | null) {
  return (transcript || "").replace(/\r\n/g, "\n").split("\n");
}

export function marginNoteLine(line?: number | null, author?: string | null, body?: string | null) {
  const who = author?.trim() || "A relative";
  const text = body?.trim() || "A note";
  const number = line && line > 0 ? line : 0;
  return number ? `Line ${number} · ${who} · ${text}` : `${who} · ${text}`;
}

export function marginsHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This letter";
  if (!count) return `No margin notes on ${name}`;
  if (count === 1) return `1 margin note on ${name}`;
  return `${count} margin notes on ${name}`;
}

export function letterMarginsHeading(count: number) {
  if (!count) return "No letters with margin notes yet";
  if (count === 1) return "1 letter with margin notes";
  return `${count} letters with margin notes`;
}

export function missingMarginsHeading(count: number) {
  if (!count) return "Every letter already has a margin note";
  if (count === 1) return "1 letter still needs a margin note";
  return `${count} letters still need a margin note`;
}

export function compileMarginNotes(notes: MarginNoteRow[]) {
  return [...notes].sort((a, b) => a.line - b.line || a.author.localeCompare(b.author) || a.body.localeCompare(b.body));
}
