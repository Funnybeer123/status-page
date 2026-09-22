import { seatLine } from "@/lib/seating";

export function placeCardHeading(name?: string | null, reunion?: string | null) {
  const who = name?.trim() || "A guest";
  const event = reunion?.trim();
  return event ? `Place card · ${who} · ${event}` : `Place card · ${who}`;
}

export function placeCardsHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "the reunion";
  if (!count) return `Place cards · ${name}`;
  if (count === 1) return `Place cards · ${name} · 1 seat`;
  return `Place cards · ${name} · ${count} seats`;
}

export function missingPlaceCardsHeading(count: number) {
  if (!count) return "Every seated reunion has place cards";
  if (count === 1) return "1 reunion still needs place cards";
  return `${count} reunions still need place cards`;
}

export function compilePlaceCards<
  T extends { id: string; tableName: string; seat?: number | null; person: { id: string; displayName: string } },
>(reunionTitle: string, seats: T[]) {
  return [...seats]
    .sort((a, b) => a.tableName.localeCompare(b.tableName) || (a.seat ?? 9999) - (b.seat ?? 9999) || a.person.displayName.localeCompare(b.person.displayName))
    .map((row) => ({
      id: row.id,
      personId: row.person.id,
      heading: placeCardHeading(row.person.displayName, reunionTitle),
      line: seatLine(row.person.displayName, row.tableName, row.seat),
      name: row.person.displayName,
      tableName: row.tableName,
      seat: row.seat ?? null,
    }));
}
