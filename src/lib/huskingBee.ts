function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type HuskingGuest = {
  id: string;
  person: string;
  personId: string;
};

export function huskingGuestLine(person?: string | null) {
  return person?.trim() || "A neighbor";
}

export function huskingBeeHeading(owner?: string | null, count = 0) {
  const field = owner?.trim() || "This field";
  if (!count) return `${field}’s field · no one yet`;
  if (count === 1) return `${field}’s field · 1 person`;
  return `${field}’s field · ${count} people`;
}

export function huskingBeesHeading(count: number) {
  if (!count) return "No husking bees yet";
  if (count === 1) return "1 husking bee";
  return `${count} husking bees`;
}

export function missingHuskingHeading(count: number) {
  if (!count) return "Every husking bee already has a roll";
  if (count === 1) return "1 husking bee still needs a roll";
  return `${count} husking bees still need a roll`;
}

export function compileHuskingGuests(rows: HuskingGuest[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person));
}

export function compileHusking<T extends { heldOn?: Date | string | null; owner: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.owner.localeCompare(b.owner),
  );
}
