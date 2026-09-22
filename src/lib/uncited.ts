export type UncitedRow = {
  id: string;
  name: string;
  kind: "birth" | "death" | "census";
  reason: string;
  href: string;
};

export function compileUncited(input: {
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[];
  citations: { personId?: string | null; kind?: string | null }[];
  censusPersonIds?: string[];
}) {
  const cited = new Set(
    input.citations
      .filter((row) => row.personId && row.kind)
      .map((row) => `${row.personId}:${row.kind}`),
  );
  const census = new Set(input.censusPersonIds ?? []);
  const rows: UncitedRow[] = [];
  for (const person of input.people) {
    if (person.birthDate && !cited.has(`${person.id}:birth`)) {
      rows.push({
        id: `${person.id}-birth`,
        name: person.displayName,
        kind: "birth",
        reason: "A birth date is recorded, but no birth citation yet.",
        href: "/worksheets",
      });
    }
    if (person.deathDate && !cited.has(`${person.id}:death`)) {
      rows.push({
        id: `${person.id}-death`,
        name: person.displayName,
        kind: "death",
        reason: "A death date is recorded, but no death citation yet.",
        href: "/worksheets",
      });
    }
    if (census.has(person.id) && !cited.has(`${person.id}:census`)) {
      rows.push({
        id: `${person.id}-census`,
        name: person.displayName,
        kind: "census",
        reason: "Counted on a census, but the page is not cited.",
        href: "/worksheets",
      });
    }
  }
  return rows;
}
