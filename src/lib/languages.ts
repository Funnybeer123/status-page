export function splitLanguages(value?: string | null) {
  return (value || "")
    .split(/[,;/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function compileLanguages(
  people: { id: string; displayName: string; languages?: string | null }[],
) {
  const groups = new Map<string, { language: string; people: { id: string; displayName: string }[] }>();
  for (const person of people) {
    for (const language of splitLanguages(person.languages)) {
      const key = language.toLowerCase();
      const group = groups.get(key) ?? { language, people: [] };
      group.people.push({ id: person.id, displayName: person.displayName });
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.language.localeCompare(b.language));
}
