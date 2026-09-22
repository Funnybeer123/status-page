export type MissingKind = "parents" | "dates" | "photo" | "story";

export type MissingRow = {
  id: string;
  displayName: string;
  kinds: MissingKind[];
};

export function missingInformation(input: {
  people: {
    id: string;
    displayName: string;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    profileAssetId?: string | null;
    deletedAt?: Date | string | null;
  }[];
  parentIds: Set<string>;
  photoIds: Set<string>;
  storyIds: Set<string>;
}): MissingRow[] {
  const rows: MissingRow[] = [];
  for (const person of input.people) {
    if (person.deletedAt) continue;
    const kinds: MissingKind[] = [];
    if (!input.parentIds.has(person.id)) kinds.push("parents");
    if (!person.birthDate && !person.deathDate) kinds.push("dates");
    if (!person.profileAssetId && !input.photoIds.has(person.id)) kinds.push("photo");
    if (!input.storyIds.has(person.id)) kinds.push("story");
    if (kinds.length) rows.push({ id: person.id, displayName: person.displayName, kinds });
  }
  return rows.sort((a, b) => b.kinds.length - a.kinds.length || a.displayName.localeCompare(b.displayName));
}
