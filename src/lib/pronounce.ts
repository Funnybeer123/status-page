export function missingPronunciations<T extends { pronunciation?: string | null; displayName: string }>(people: T[]) {
  return people
    .filter((person) => !person.pronunciation?.trim())
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function saidAs(name: string, pronunciation?: string | null) {
  if (!pronunciation?.trim()) return name;
  return `${name} (${pronunciation.trim()})`;
}
