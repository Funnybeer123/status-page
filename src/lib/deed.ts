export function hasDeed(record?: { assetId?: string | null } | null) {
  return Boolean(record?.assetId);
}

export function deedHeading(title: string) {
  return `Deed image · ${title.trim() || "land record"}`;
}

export function deedLine(title?: string | null) {
  return title?.trim() || "The deed image";
}

export function missingDeedsHeading(count: number) {
  if (!count) return "Every land abstract has its deed image";
  if (count === 1) return "1 land record still needs a deed image";
  return `${count} land records still need a deed image`;
}
