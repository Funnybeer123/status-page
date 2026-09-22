export function compileBaptisms(
  events: {
    id: string;
    kind: string;
    title: string;
    happenedOn?: Date | string | null;
    personId: string;
    personName: string;
    place?: string | null;
  }[],
) {
  return events
    .filter((event) => event.kind === "baptism")
    .sort((a, b) => {
      const left = a.happenedOn ? new Date(a.happenedOn).getTime() : 0;
      const right = b.happenedOn ? new Date(b.happenedOn).getTime() : 0;
      return left - right;
    });
}

export function compileCauses(
  people: { id: string; displayName: string; causeOfDeath?: string | null; deathDate?: Date | string | null }[],
) {
  return people
    .filter((person) => person.causeOfDeath?.trim())
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      causeOfDeath: person.causeOfDeath!.trim(),
      deathDate: person.deathDate ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
