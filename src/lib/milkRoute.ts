export type MilkStop = {
  id: string;
  person: string;
  stopOrder: number;
};

export function milkStopLine(person?: string | null, order?: number | null) {
  const who = person?.trim() || "A stop";
  return order != null ? `Stop ${order} · ${who}` : who;
}

export function milkRouteHeading(name?: string | null, count = 0) {
  const route = name?.trim() || "Milk route";
  if (!count) return `${route} · no stops yet`;
  if (count === 1) return `${route} · 1 stop`;
  return `${route} · ${count} stops`;
}

export function milkRoutesHeading(count: number) {
  if (!count) return "No milk routes yet";
  if (count === 1) return "1 milk route";
  return `${count} milk routes`;
}

export function missingMilkHeading(count: number) {
  return count ? "The milk route is still empty" : "The milk route already has a stop";
}

export function compileMilkStops(stops: MilkStop[]) {
  return [...stops].sort((a, b) => a.stopOrder - b.stopOrder || a.person.localeCompare(b.person));
}
