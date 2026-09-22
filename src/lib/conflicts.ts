function iso(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export type DateConflict = {
  personId: string;
  displayName: string;
  kind: "birth" | "death";
  dates: { eventId: string | null; happenedOn: string; preferred: boolean }[];
};

export function findDateConflicts(input: {
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null; deletedAt?: Date | string | null }[];
  events: { id: string; personId: string; kind: string; happenedOn?: Date | string | null; preferred?: boolean }[];
}): DateConflict[] {
  const conflicts: DateConflict[] = [];
  for (const person of input.people) {
    if (person.deletedAt) continue;
    for (const kind of ["birth", "death"] as const) {
      const recorded = new Map<string, { eventId: string | null; happenedOn: string; preferred: boolean }>();
      const canonical = iso(kind === "birth" ? person.birthDate : person.deathDate);
      if (canonical) recorded.set(canonical, { eventId: null, happenedOn: canonical, preferred: true });
      for (const event of input.events) {
        if (event.personId !== person.id || event.kind !== kind) continue;
        const date = iso(event.happenedOn);
        if (!date) continue;
        const existing = recorded.get(date);
        recorded.set(date, {
          eventId: event.id,
          happenedOn: date,
          preferred: Boolean(event.preferred) || existing?.preferred || date === canonical,
        });
      }
      if (recorded.size > 1) {
        conflicts.push({
          personId: person.id,
          displayName: person.displayName,
          kind,
          dates: [...recorded.values()].sort((a, b) => a.happenedOn.localeCompare(b.happenedOn)),
        });
      }
    }
  }
  return conflicts;
}
