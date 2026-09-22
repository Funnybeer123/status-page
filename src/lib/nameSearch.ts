export function nameSearchExcerpt(displayName: string, alsoName: string) {
  return `${displayName.trim() || "This person"} is also ${alsoName.trim() || "known by another name"}`;
}

export function marriedNameLine(displayName: string, familyName?: string | null) {
  const married = familyName?.trim();
  return married ? `${displayName.trim()} · married name ${married}` : displayName.trim();
}

export function maidenNameLine(displayName: string, maiden?: string | null) {
  const name = maiden?.trim();
  return name ? `${displayName.trim()} · maiden name ${name}` : displayName.trim();
}

export function bothNamesHeading(count: number) {
  if (!count) return "No one has both a maiden name and a married name yet";
  if (count === 1) return "1 person found by maiden name and married name";
  return `${count} people found by maiden name and married name`;
}
