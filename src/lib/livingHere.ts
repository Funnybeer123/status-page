export function stillLivingHere(person: { deathDate?: Date | string | null }, residence: { endedAt?: Date | string | null }) {
  return !person.deathDate && !residence.endedAt;
}

export function livingHereHeading(place: string, count: number) {
  const name = place.trim() || "this place";
  if (!count) return `No one still lives in ${name}`;
  if (count === 1) return `1 person still lives in ${name}`;
  return `${count} people still live in ${name}`;
}

export function emptyLivingHereHeading(count: number) {
  if (!count) return "Every place still has someone living there";
  if (count === 1) return "1 place has no one still living there";
  return `${count} places have no one still living there`;
}

export function livingHereLine(name?: string | null) {
  return `${name?.trim() || "A relative"} still lives here`;
}

export function compileLivingHere<
  T extends {
    person: { id: string; displayName: string; deathDate?: Date | string | null };
    endedAt?: Date | string | null;
  },
>(residences: T[]) {
  const seen = new Set<string>();
  const items: { id: string; displayName: string; line: string; href: string }[] = [];
  for (const row of residences) {
    if (!stillLivingHere(row.person, row) || seen.has(row.person.id)) continue;
    seen.add(row.person.id);
    items.push({
      id: row.person.id,
      displayName: row.person.displayName,
      line: livingHereLine(row.person.displayName),
      href: `/people/${row.person.id}`,
    });
  }
  return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
