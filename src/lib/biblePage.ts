export function hasBiblePage(record?: { assetId?: string | null } | null) {
  return Boolean(record?.assetId);
}

export function biblePageHeading(title: string) {
  return `Bible page · ${title.trim() || "family Bible"}`;
}

export function missingBiblePagesHeading(count: number) {
  if (!count) return "Every Bible record has its page image";
  if (count === 1) return "1 Bible record still needs a page image";
  return `${count} Bible records still need a page image`;
}
