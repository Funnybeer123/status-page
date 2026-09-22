export function normalizeBranchColor(color?: string | null) {
  const text = color?.trim();
  if (!text) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return text;
  if (/^[a-z][a-z-]+$/i.test(text)) return text.toLowerCase();
  return null;
}

export function branchColorLine(name: string, color?: string | null) {
  const who = name.trim() || "This branch";
  const swatch = normalizeBranchColor(color);
  return swatch ? `${who} · ${swatch}` : `${who} · no color yet`;
}

export function branchLegendHeading(count: number) {
  if (!count) return "No branch colors on the tree yet";
  if (count === 1) return "1 branch color on the tree";
  return `${count} branch colors on the tree`;
}

export function uncoloredBranchesHeading(count: number) {
  if (!count) return "Every branch has a color";
  if (count === 1) return "1 branch still needs a color";
  return `${count} branches still need a color`;
}
