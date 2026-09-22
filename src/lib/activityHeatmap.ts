export function utcMonthKey(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

export function heatmapHeading(count: number) {
  if (!count) return "No archive activity yet";
  if (count === 1) return "Archive activity · 1 month";
  return `Archive activity · ${count} months`;
}

export function emptyHeatmapHeading() {
  return "The activity heatmap is still quiet";
}

export function hottestMonthHeading(month?: string | null, count = 0) {
  if (!month) return "No month was busier than the others";
  if (count === 1) return `Busiest month · ${month} · 1 addition`;
  return `Busiest month · ${month} · ${count} additions`;
}

export function heatmapIntensity(count: number, max: number) {
  if (!max || !count) return 0;
  return Math.min(1, count / max);
}

export type HeatMonth = { month: string; count: number; intensity: number };

export function compileActivityHeatmap(activities: { createdAt?: Date | string | null }[]) {
  const counts = new Map<string, number>();
  for (const item of activities) {
    const key = utcMonthKey(item.createdAt);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const max = Math.max(0, ...counts.values());
  const months: HeatMonth[] = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count, intensity: heatmapIntensity(count, max) }));
  const hottest = [...months].sort((a, b) => b.count - a.count || b.month.localeCompare(a.month))[0] || null;
  return {
    months,
    hottest,
    heading: heatmapHeading(months.length),
    hottestHeading: hottestMonthHeading(hottest?.month, hottest?.count ?? 0),
  };
}
