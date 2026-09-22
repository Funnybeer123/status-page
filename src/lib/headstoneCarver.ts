export type CarverRow = {
  id: string;
  carver: string;
  person: string;
  yard: string;
};

export function carverLine(carver?: string | null, person?: string | null, yard?: string | null) {
  const who = carver?.trim() || "A carver";
  const forWhom = person?.trim() || "the stone";
  const where = yard?.trim() || "the yard";
  return `${who} carved ${forWhom} · ${where}`;
}

export function carversHeading(count: number) {
  if (!count) return "No headstone carvers yet";
  if (count === 1) return "1 headstone carver";
  return `${count} headstone carvers`;
}

export function missingCarversHeading(count: number) {
  return count ? "No headstone carver has been written down" : "A headstone carver is already written down";
}

export function compileCarvers(rows: CarverRow[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person) || a.carver.localeCompare(b.carver));
}
