export type ConfirmationPupil = {
  id: string;
  person: string;
  personId: string;
};

export function confirmationLine(person?: string | null, church?: string | null, year?: number | null) {
  const who = person?.trim() || "A confirmand";
  const house = church?.trim() || "church";
  const when = year != null ? String(year) : "year unknown";
  return `${who} · ${house} · ${when}`;
}

export function confirmationHeading(church?: string | null, year?: number | null, count = 0) {
  const house = church?.trim() || "Confirmation";
  const when = year != null ? String(year) : "";
  const title = when ? `${house} · ${when}` : house;
  if (!count) return `${title} · no class yet`;
  if (count === 1) return `${title} · 1 confirmand`;
  return `${title} · ${count} confirmands`;
}

export function confirmationsHeading(count: number) {
  if (!count) return "No confirmation classes yet";
  if (count === 1) return "1 confirmation class";
  return `${count} confirmation classes`;
}

export function missingConfirmationsHeading(count: number) {
  if (!count) return "Every confirmation class already has a roll";
  if (count === 1) return "1 confirmation class still needs a roll";
  return `${count} confirmation classes still need a roll`;
}

export function compileConfirmands(rows: ConfirmationPupil[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person));
}
