export function plotHasPosition(plot?: { x?: number | null; y?: number | null } | null) {
  return plot?.x != null && plot?.y != null;
}

export function plotMapHeading(name: string, count: number) {
  const cemetery = name.trim() || "This cemetery";
  if (!count) return `No plots on the map at ${cemetery}`;
  if (count === 1) return `1 plot on the map at ${cemetery}`;
  return `${count} plots on the map at ${cemetery}`;
}

export function plotPinLine(name: string, plot?: string | null) {
  const who = name.trim() || "Someone in the family";
  return plot?.trim() ? `${who} · ${plot.trim()}` : `${who} · unmarked`;
}

export function unmappedPlotsHeading(count: number) {
  if (!count) return "Every plot has a place on the map";
  if (count === 1) return "1 plot still needs a place on the map";
  return `${count} plots still need a place on the map`;
}

export function clampPlotPosition(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}
