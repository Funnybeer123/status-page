export type CrestRow = {
  id: string;
  title: string;
  blazon: string;
  tincture?: string | null;
  notes?: string | null;
};

export function crestLine(title?: string | null, blazon?: string | null) {
  const name = title?.trim() || "Family crest";
  const arms = blazon?.trim();
  return arms ? `${name} · ${arms}` : name;
}

export function crestsHeading(count: number) {
  if (!count) return "No family crest yet";
  if (count === 1) return "1 family crest";
  return `${count} family crests`;
}

export function missingCrestHeading(count: number) {
  return count ? "This family still needs a crest" : "The family already has a crest";
}

export function compileCrests(rows: CrestRow[]) {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title) || a.blazon.localeCompare(b.blazon));
}
