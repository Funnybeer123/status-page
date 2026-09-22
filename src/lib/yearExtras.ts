export function missingDirectoryPeople<T extends { id: string }>(
  people: T[],
  entries: { personId?: string | null }[],
) {
  const have = new Set(entries.map((entry) => entry.personId).filter((id): id is string => Boolean(id)));
  return people.filter((person) => !have.has(person.id));
}

export function missingDirectoryHeading(count: number) {
  if (!count) return "Everyone has a city-directory line";
  if (count === 1) return "1 person still needs a city-directory line";
  return `${count} people still need a city-directory line`;
}

export function classmatesOf<
  P extends { personId: string; person?: { displayName: string } },
  T extends { pupils: P[] },
>(personId: string, classes: T[]): Array<T & { mates: P[] }> {
  return classes
    .filter((row) => row.pupils.some((pupil) => pupil.personId === personId))
    .map((row) => ({
      ...row,
      mates: row.pupils.filter((pupil) => pupil.personId !== personId),
    }));
}

export function classmatesHeading(name: string, count: number) {
  if (!count) return `No classmates recorded for ${name}`;
  if (count === 1) return `1 classmate of ${name}`;
  return `${count} classmates of ${name}`;
}

export function papersNeeded<T extends { id: string; personId: string }>(
  services: T[],
  papers: { serviceId?: string | null; personId: string }[],
) {
  return services.filter(
    (service) =>
      !papers.some(
        (paper) => paper.serviceId === service.id || (!paper.serviceId && paper.personId === service.personId),
      ),
  );
}

export function papersNeededHeading(count: number) {
  if (!count) return "Every service has a draft or pension paper";
  if (count === 1) return "1 service still needs a draft or pension paper";
  return `${count} services still need a draft or pension paper`;
}

export function suggestThere<T extends { id: string }>(events: T[], alreadyEventIds: string[]) {
  const have = new Set(alreadyEventIds);
  return events.filter((event) => !have.has(event.id));
}

export function thereSuggestHeading(count: number) {
  if (!count) return "Every family event has been marked";
  if (count === 1) return "1 event you could still mark";
  return `${count} events you could still mark`;
}
