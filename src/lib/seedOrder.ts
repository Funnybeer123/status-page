export type SeedRow = {
  id: string;
  person: string;
  variety: string;
  quantity: string;
  supplier: string;
  year?: number | null;
};

export function seedOrderLine(variety?: string | null, quantity?: string | null, supplier?: string | null) {
  const crop = variety?.trim() || "A seed";
  const how = quantity?.trim() || "some";
  const from = supplier?.trim() || "a supplier";
  return `${crop} · ${how} · ${from}`;
}

export function seedOrdersHeading(count: number) {
  if (!count) return "No spring seed orders yet";
  if (count === 1) return "1 spring seed order";
  return `${count} spring seed orders`;
}

export function missingSeedsHeading(count: number) {
  return count ? "The spring seed order is still empty" : "A spring seed order is already written down";
}

export function compileSeedOrders(rows: SeedRow[]) {
  return [...rows].sort(
    (a, b) =>
      String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) ||
      a.variety.localeCompare(b.variety) ||
      a.person.localeCompare(b.person),
  );
}
