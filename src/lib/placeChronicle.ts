export type ChronicleItem = {
  id: string;
  kind: "event" | "residence" | "photo" | "home" | "census" | "voyage" | "letter" | "story";
  title: string;
  href: string;
  date?: string | Date | null;
};

export function chronicleHeading(place: string, count: number) {
  if (!count) return `Nothing yet happened in ${place}`;
  if (count === 1) return `1 thing that happened in ${place}`;
  return `${count} things that happened in ${place}`;
}

export function compileChronicle(items: ChronicleItem[]) {
  return items.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

export function placeMatch(placeName: string, value?: string | null) {
  if (!value) return false;
  return value.toLowerCase().includes(placeName.toLowerCase()) || placeName.toLowerCase().includes(value.toLowerCase());
}
