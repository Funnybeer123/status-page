export function recentsHeading(count: number) {
  if (!count) return "No people opened recently";
  if (count === 1) return "1 recently opened person";
  return `${count} recently opened people`;
}

export function recentLine(name: string) {
  return name.trim() || "Someone in the family";
}

export function sortRecents<T extends { openedAt: Date | string }>(rows: T[]) {
  return [...rows].sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)));
}
