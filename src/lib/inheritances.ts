export type InheritanceRow = {
  id: string;
  title: string;
  heir: string;
  source?: string | null;
  notes?: string | null;
  href?: string;
};

export function inheritanceLine(title?: string | null, heir?: string | null) {
  const item = title?.trim() || "An item";
  const who = heir?.trim();
  return who ? `${item} · inherited by ${who}` : item;
}

export function inheritancesHeading(count: number) {
  if (!count) return "No inheritances yet";
  if (count === 1) return "1 inherited item";
  return `${count} inherited items`;
}

export function missingInheritanceHeading(count: number) {
  if (!count) return "Every will already names who inherited what";
  if (count === 1) return "1 will still needs an inheritance table";
  return `${count} wills still need an inheritance table`;
}

export function inheritanceReceiptHeading(source?: string | null) {
  const name = source?.trim() || "This will";
  return `Who inherited what · ${name}`;
}

export function compileInheritances(rows: InheritanceRow[]) {
  return [...rows].sort((a, b) => a.heir.localeCompare(b.heir) || a.title.localeCompare(b.title));
}
