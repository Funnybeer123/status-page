export type NamedByRow = {
  id: string;
  name: string;
  child: string;
  namedBy: string;
  childId: string;
  namedById?: string | null;
};

export function namedByLine(name?: string | null, namedBy?: string | null) {
  const child = name?.trim() || "A child";
  const who = namedBy?.trim();
  return who ? `${child} · named by ${who}` : `${child} · who named them is still unknown`;
}

export function givenNamesHeading(count: number) {
  if (!count) return "No named-by records yet";
  if (count === 1) return "1 name with who chose it";
  return `${count} names with who chose them`;
}

export function missingNamedByHeading(count: number) {
  if (!count) return "Every recorded name already says who chose it";
  if (count === 1) return "1 name still needs who chose it";
  return `${count} names still need who chose them`;
}

export function compileNamedBy(rows: NamedByRow[]) {
  return [...rows].sort((a, b) => a.child.localeCompare(b.child) || a.name.localeCompare(b.name));
}
