export type LifeMark = {
  id: string;
  title: string;
  href: string;
  date?: string | null;
  who: string;
  whoId: string;
};

export function compileTogether(left: LifeMark[], right: LifeMark[]) {
  return [...left, ...right].sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
}

export function twoLivesHeading(a: string, b: string) {
  return `${a} and ${b} on one timeline`;
}

export function twoLivesLine(item: LifeMark) {
  return `${item.who} · ${item.title}`;
}

export function marksFromHistory(
  entries: { id: string; title: string; href: string; happenedOn?: string | null; people: { id: string }[] }[],
  personId: string,
  who: string,
): LifeMark[] {
  return entries
    .filter((entry) => entry.people.some((person) => person.id === personId))
    .map((entry) => ({
      id: `${personId}:${entry.id}`,
      title: entry.title,
      href: entry.href,
      date: entry.happenedOn,
      who,
      whoId: personId,
    }));
}
