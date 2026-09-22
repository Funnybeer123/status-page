export function placeNameLine(familyName?: string | null, officialName?: string | null) {
  const called = familyName?.trim() || "An unnamed place";
  const official = officialName?.trim();
  return official && official !== called ? `${called} · the family name for ${official}` : called;
}

export function placeNamesHeading(count: number) {
  if (!count) return "No family names for places yet";
  if (count === 1) return "1 family name for a place";
  return `${count} family names for places`;
}

export function missingPlaceNameHeading(count: number) {
  if (!count) return "Every place has a family name";
  if (count === 1) return "1 place still needs a family name";
  return `${count} places still need a family name`;
}

export function compilePlaceNames<
  T extends { name: string; notes?: string | null; place?: { name?: string | null } | null },
>(rows: T[]) {
  return [...rows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      ...row,
      line: placeNameLine(row.name, row.place?.name),
    }));
}
