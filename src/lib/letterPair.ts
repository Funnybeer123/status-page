export function letterPairHeading(name: string) {
  return `Two letters by ${name.trim() || "the same person"}`;
}

export function letterPairSideLabel(title: string, writtenAt?: string | null) {
  return writtenAt ? `${title.trim() || "A letter"} · ${writtenAt}` : title.trim() || "A letter";
}

export function peopleWithTwoLettersHeading(count: number) {
  if (!count) return "No one has two letters to compare yet";
  if (count === 1) return "1 person has two letters side by side";
  return `${count} people have two letters side by side`;
}

function letterDateKey(value?: Date | string | null, title?: string | null) {
  if (!value) return `~${title || ""}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function sortLettersForPair<T extends { writtenAt?: Date | string | null; title?: string | null }>(letters: T[]) {
  return [...letters].sort((a, b) => letterDateKey(a.writtenAt, a.title).localeCompare(letterDateKey(b.writtenAt, b.title)));
}

export function peopleWithTwoLetters<T extends { people?: { personId: string; displayName: string }[] }>(letters: T[]) {
  const groups = new Map<string, { personId: string; displayName: string; letters: T[] }>();
  for (const letter of letters) {
    for (const person of letter.people ?? []) {
      const group = groups.get(person.personId) ?? { personId: person.personId, displayName: person.displayName, letters: [] };
      group.letters.push(letter);
      groups.set(person.personId, group);
    }
  }
  return [...groups.values()].filter((group) => group.letters.length >= 2);
}
