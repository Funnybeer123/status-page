export type OriginalRow = {
  id: string;
  title: string;
  holder: string;
  holderId?: string | null;
};

export function holderLine(title?: string | null, holder?: string | null) {
  const letter = title?.trim() || "This original";
  const who = holder?.trim();
  return who ? `${letter} · held by ${who}` : `${letter} · holder unknown`;
}

export function originalsHeading(count: number) {
  if (!count) return "No originals with a holder yet";
  if (count === 1) return "1 original with a holder";
  return `${count} originals with a holder`;
}

export function missingOriginalsHeading(count: number) {
  if (!count) return "Every letter already names who holds the original";
  if (count === 1) return "1 letter still needs who holds the original";
  return `${count} letters still need who holds the original`;
}

export function compileOriginals(rows: OriginalRow[]) {
  return [...rows].sort((a, b) => a.holder.localeCompare(b.holder) || a.title.localeCompare(b.title));
}
