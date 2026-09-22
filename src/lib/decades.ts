export function decadeOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(date.getUTCFullYear() / 10) * 10;
}

export function groupByDecade<T extends { happenedOn?: Date | string | null; writtenAt?: Date | string | null }>(
  items: T[],
) {
  const groups = new Map<number | "undated", T[]>();
  for (const item of items) {
    const key = decadeOf(item.happenedOn ?? item.writtenAt) ?? "undated";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "undated") return 1;
    if (b[0] === "undated") return -1;
    return a[0] - b[0];
  });
}
