function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type PeddlerRow = {
  id: string;
  peddler: string;
  goods: string;
  buyer: string;
  visitedOn?: Date | string | null;
};

export function peddlerLine(peddler?: string | null, goods?: string | null, buyer?: string | null, visitedOn?: string | null) {
  const who = peddler?.trim() || "A peddler";
  const sold = goods?.trim() || "goods";
  const to = buyer?.trim() || "the family";
  const day = visitedOn?.trim();
  const base = `${who} sold ${sold} to ${to}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function peddlersHeading(count: number) {
  if (!count) return "No peddler visits yet";
  if (count === 1) return "1 peddler visit";
  return `${count} peddler visits`;
}

export function missingPeddlersHeading(count: number) {
  return count ? "No peddler visit has been written down" : "A peddler visit is already written down";
}

export function compilePeddlers(rows: PeddlerRow[]) {
  return [...rows]
    .map((row) => ({ ...row, visitKey: isoKey(row.visitedOn) }))
    .sort((a, b) => a.visitKey.localeCompare(b.visitKey) || a.peddler.localeCompare(b.peddler));
}
