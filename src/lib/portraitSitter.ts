export type SitterRow = {
  id: string;
  title: string;
  sitter: string;
  sitterId?: string | null;
};

export function sitterLine(title?: string | null, sitter?: string | null) {
  const photo = title?.trim() || "A portrait";
  const who = sitter?.trim();
  return who ? `${who} sat for ${photo}` : `${photo} · sitter unknown`;
}

export function sittersHeading(count: number) {
  if (!count) return "No portrait sitters yet";
  if (count === 1) return "1 portrait with a sitter";
  return `${count} portraits with a sitter`;
}

export function missingSittersHeading(count: number) {
  if (!count) return "Every portrait already names the sitter";
  if (count === 1) return "1 portrait still needs a sitter";
  return `${count} portraits still need a sitter`;
}

export function compileSitters(rows: SitterRow[]) {
  return [...rows].sort((a, b) => a.sitter.localeCompare(b.sitter) || a.title.localeCompare(b.title));
}
