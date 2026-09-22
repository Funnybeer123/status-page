import { lookupCoordinates } from "@/lib/geocode";
import { hasPostmark, postmarkLine } from "@/lib/postmark";

export function postmarkMapHeading(count: number) {
  if (!count) return "No postmarks on the map yet";
  if (count === 1) return "1 letter mailed from a known place";
  return `${count} letters mailed from known places`;
}

export function missingPostmarkMapHeading(count: number) {
  if (!count) return "Every postmark sits on the map";
  if (count === 1) return "1 postmark still needs a place";
  return `${count} postmarks still need a place`;
}

export function compilePostmarkMap<
  T extends {
    id: string;
    title: string;
    stampText?: string | null;
    postmarkedAt?: Date | string | null;
    place?: { name?: string | null; locality?: string | null; region?: string | null; latitude?: number | null; longitude?: number | null } | null;
  },
>(letters: T[]) {
  const placed: Array<{
    id: string;
    title: string;
    line: string;
    href: string;
    latitude: number;
    longitude: number;
  }> = [];
  const missing: T[] = [];
  for (const letter of letters) {
    if (!hasPostmark(letter)) continue;
    const known = lookupCoordinates({
      name: letter.stampText,
      locality: letter.place?.locality || letter.place?.name || letter.stampText,
      region: letter.place?.region,
    });
    const lat = letter.place?.latitude ?? known?.latitude;
    const lng = letter.place?.longitude ?? known?.longitude;
    if (lat == null || lng == null) {
      missing.push(letter);
      continue;
    }
    placed.push({
      id: letter.id,
      title: letter.title,
      line: postmarkLine(letter.stampText, letter.postmarkedAt),
      href: `/letters/${letter.id}`,
      latitude: lat,
      longitude: lng,
    });
  }
  return { placed, missing };
}

export function postmarkTownsHeading(count: number) {
  if (!count) return "No towns on the postmark map yet";
  if (count === 1) return "1 town letters were mailed from";
  return `${count} towns letters were mailed from`;
}

export function compilePostmarkTowns<T extends { id: string; title: string; line: string; latitude: number; longitude: number }>(
  placed: T[],
) {
  const groups = new Map<string, T[]>();
  for (const letter of placed) {
    const town = letter.line.split(" · ")[0] || "Unknown town";
    groups.set(town, [...(groups.get(town) ?? []), letter]);
  }
  return [...groups.entries()]
    .map(([town, items]) => ({
      town,
      items: items.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.town.localeCompare(b.town));
}
