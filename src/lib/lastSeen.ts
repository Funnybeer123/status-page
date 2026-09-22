function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function lastSeenLine(name?: string | null, seenOn?: string | null) {
  const who = name?.trim() || "A relative";
  const when = seenOn?.trim();
  return when && when !== "9999-12-31" ? `Last time we saw ${who} · ${when}` : `Last time we saw ${who} is still unknown`;
}

export function lastSeenHeading(count: number) {
  if (!count) return "No last-seen dates yet";
  if (count === 1) return "1 last-seen date";
  return `${count} last-seen dates`;
}

export function missingLastSeenHeading(count: number) {
  if (!count) return "Everyone already has a last-seen date";
  if (count === 1) return "1 person still needs a last-seen date";
  return `${count} people still need a last-seen date`;
}

export function compileLastSeen(
  people: { id: string; displayName: string; lastSeenOn?: Date | string | null }[],
) {
  return people
    .filter((person) => person.lastSeenOn)
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      seenOn: isoKey(person.lastSeenOn),
      line: lastSeenLine(person.displayName, isoKey(person.lastSeenOn)),
    }))
    .sort((a, b) => a.seenOn.localeCompare(b.seenOn) || a.displayName.localeCompare(b.displayName));
}

export function compileMissingLastSeen(
  people: { id: string; displayName: string; lastSeenOn?: Date | string | null }[],
) {
  return people
    .filter((person) => !person.lastSeenOn)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
