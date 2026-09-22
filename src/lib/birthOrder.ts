export type BirthOrderPerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
};

export function sortByBirth<T extends BirthOrderPerson>(people: T[]) {
  return [...people].sort((a, b) => {
    if (!a.birthDate && !b.birthDate) return a.displayName.localeCompare(b.displayName);
    if (!a.birthDate) return 1;
    if (!b.birthDate) return -1;
    return String(a.birthDate).localeCompare(String(b.birthDate));
  });
}

export function birthOrder<T extends BirthOrderPerson>(people: T[]) {
  return sortByBirth(people).map((person, index) => ({
    ...person,
    order: index + 1,
  }));
}

export function birthOrderHeading(name: string, count: number) {
  const who = name.trim() || "This family";
  if (!count) return `No siblings listed for ${who}`;
  if (count === 1) return `${who} is an only child on the archive`;
  return `Birth order for ${who}'s siblings`;
}

export function birthOrderLine(order: number, name: string, born?: string | null) {
  return born ? `${order}. ${name} · born ${born}` : `${order}. ${name} · birth date unknown`;
}

export function missingBirthDatesHeading(count: number) {
  if (!count) return "Every sibling has a birth date";
  if (count === 1) return "1 sibling still needs a birth date";
  return `${count} siblings still need a birth date`;
}

export function siblingSetsHeading(count: number) {
  if (!count) return "No sibling sets yet";
  if (count === 1) return "1 set of siblings";
  return `${count} sets of siblings`;
}
