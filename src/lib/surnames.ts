export type SurnamePerson = {
  id: string;
  displayName: string;
  familyName?: string | null;
  names?: { kind: string; name: string }[];
};

export type SurnameGroup = {
  surname: string;
  people: { id: string; displayName: string }[];
};

function lastToken(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) || value.trim();
}

function collectSurnames(person: SurnamePerson) {
  const surnames = new Set<string>();
  if (person.familyName?.trim()) surnames.add(person.familyName.trim());
  const fromDisplay = lastToken(person.displayName);
  if (fromDisplay && fromDisplay.length > 1 && !/^[A-Z]\.$/.test(fromDisplay)) {
    surnames.add(fromDisplay);
  }
  for (const name of person.names ?? []) {
    if (name.kind === "maiden" || name.kind === "birth" || name.kind === "aka") {
      const token = lastToken(name.name);
      if (token) surnames.add(token);
    }
  }
  if (!surnames.size) surnames.add("Unknown");
  return [...surnames];
}

export function groupSurnames(people: SurnamePerson[]): SurnameGroup[] {
  const buckets = new Map<string, SurnameGroup>();
  for (const person of people) {
    for (const surname of collectSurnames(person)) {
      const key = surname.toLowerCase();
      const bucket = buckets.get(key) ?? { surname, people: [] };
      if (!bucket.people.some((item) => item.id === person.id)) {
        bucket.people.push({ id: person.id, displayName: person.displayName });
      }
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()]
    .map((group) => ({
      ...group,
      people: group.people.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .sort((a, b) => a.surname.localeCompare(b.surname));
}
