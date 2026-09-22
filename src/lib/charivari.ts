function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type CharivariGuest = {
  id: string;
  person: string;
  personId: string;
  noise: string;
};

export function charivariGuestLine(person?: string | null, noise?: string | null) {
  const who = person?.trim() || "A neighbor";
  const what = noise?.trim() || "noise";
  return `${who} · ${what}`;
}

export function charivariHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This charivari";
  if (!count) return `${name} · no one yet`;
  if (count === 1) return `${name} · 1 person`;
  return `${name} · ${count} people`;
}

export function charivarisHeading(count: number) {
  if (!count) return "No charivaris yet";
  if (count === 1) return "1 charivari";
  return `${count} charivaris`;
}

export function missingCharivariHeading(count: number) {
  if (!count) return "Every charivari already has a roll";
  if (count === 1) return "1 charivari still needs a roll";
  return `${count} charivaris still need a roll`;
}

export function compileCharivariGuests(rows: CharivariGuest[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person) || a.noise.localeCompare(b.noise));
}

export function compileCharivaris<T extends { heldOn?: Date | string | null; title: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.title.localeCompare(b.title),
  );
}
