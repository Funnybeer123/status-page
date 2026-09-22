import { formatYear, lifespan } from "@/lib/dates";

function residenceKey(value?: Date | string | null) {
  if (!value) return "9999-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-";
  return date.toISOString();
}

export function lifeBookmarkHeading(name?: string | null) {
  const who = name?.trim();
  return who ? `Life bookmark · ${who}` : "Life bookmark";
}

export function lifeBookmarkSpan(birth?: Date | string | null, death?: Date | string | null) {
  return lifespan(birth, death) || "Dates unknown";
}

export function lifeBookmarkPlaces(places: Array<string | null | undefined> = []) {
  const names = places.map((place) => place?.trim()).filter((place): place is string => Boolean(place));
  if (!names.length) return "No key places yet";
  return names.join(" · ");
}

export function missingBookmarkPlacesHeading(count: number) {
  if (!count) return "Every life bookmark has a key place";
  if (count === 1) return "1 person still needs a key place on a bookmark";
  return `${count} people still need a key place on a bookmark`;
}

export function lifeBookmarksHeading(count: number) {
  if (!count) return "No life bookmarks yet";
  if (count === 1) return "1 life bookmark";
  return `${count} life bookmarks`;
}

export function compileLifeBookmark<
  T extends {
    displayName: string;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
  },
>(
  person: T,
  residences: Array<{
    startedAt?: Date | string | null;
    place?: { name?: string | null } | null;
  }> = [],
) {
  const places = [...residences]
    .sort((a, b) => residenceKey(a.startedAt).localeCompare(residenceKey(b.startedAt)))
    .map((row) => row.place?.name)
    .filter((name): name is string => Boolean(name?.trim()));
  return {
    heading: lifeBookmarkHeading(person.displayName),
    span: lifeBookmarkSpan(person.birthDate, person.deathDate),
    places: lifeBookmarkPlaces(places),
    years: [formatYear(person.birthDate), formatYear(person.deathDate)].filter(Boolean).join("–"),
  };
}
