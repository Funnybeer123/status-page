function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type ShellingGuest = {
  id: string;
  person: string;
  personId: string;
};

export function shellingGuestLine(person?: string | null) {
  return person?.trim() || "A neighbor";
}

export function shellingBeeHeading(owner?: string | null, count = 0) {
  const crib = owner?.trim() || "This crib";
  if (!count) return `${crib}’s crib · no one yet`;
  if (count === 1) return `${crib}’s crib · 1 person`;
  return `${crib}’s crib · ${count} people`;
}

export function shellingBeesHeading(count: number) {
  if (!count) return "No corn-shelling bees yet";
  if (count === 1) return "1 corn-shelling bee";
  return `${count} corn-shelling bees`;
}

export function missingShellingHeading(count: number) {
  if (!count) return "Every corn-shelling bee already has a roll";
  if (count === 1) return "1 corn-shelling bee still needs a roll";
  return `${count} corn-shelling bees still need a roll`;
}

export function compileShellingGuests(rows: ShellingGuest[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person));
}

export function compileShelling<T extends { heldOn?: Date | string | null; owner: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.owner.localeCompare(b.owner),
  );
}
