function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type CellarGuest = {
  id: string;
  person: string;
  personId: string;
};

export function cellarGuestLine(person?: string | null) {
  return person?.trim() || "A neighbor";
}

export function cellarHeading(storm?: string | null, count = 0) {
  const name = storm?.trim() || "This storm";
  if (!count) return `${name} · no one yet`;
  if (count === 1) return `${name} · 1 person`;
  return `${name} · ${count} people`;
}

export function cellarsHeading(count: number) {
  if (!count) return "No cyclone-cellar lists yet";
  if (count === 1) return "1 cyclone-cellar list";
  return `${count} cyclone-cellar lists`;
}

export function missingCellarsHeading(count: number) {
  if (!count) return "Every cyclone cellar already has a roll";
  if (count === 1) return "1 cyclone cellar still needs a roll";
  return `${count} cyclone cellars still need a roll`;
}

export function compileCellarGuests(rows: CellarGuest[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person));
}

export function compileCellars<T extends { heldOn?: Date | string | null; storm: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.storm.localeCompare(b.storm),
  );
}
