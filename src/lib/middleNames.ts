export type MiddleRow = {
  id: string;
  displayName: string;
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
};

export function hasMiddleName(person?: { middleName?: string | null }) {
  return Boolean(person?.middleName?.trim());
}

export function middleNameLine(person?: MiddleRow | null) {
  const given = person?.givenName?.trim() || "";
  const middle = person?.middleName?.trim() || "";
  const family = person?.familyName?.trim() || "";
  const parts = [given, middle, family].filter(Boolean);
  return parts.length ? parts.join(" ") : person?.displayName || "A relative";
}

export function middlesHeading(count: number) {
  if (!count) return "No middle names yet";
  if (count === 1) return "1 middle name";
  return `${count} middle names`;
}

export function missingMiddlesHeading(count: number) {
  if (!count) return "Everyone already has a middle name";
  if (count === 1) return "1 person still needs a middle name";
  return `${count} people still need a middle name`;
}

export function compileMiddles(people: MiddleRow[]) {
  return people.filter(hasMiddleName).sort((a, b) => middleNameLine(a).localeCompare(middleNameLine(b)));
}

export function compileMissingMiddles(people: MiddleRow[]) {
  return people.filter((person) => !hasMiddleName(person)).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
