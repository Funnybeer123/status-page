export type WillWitnessRow = {
  id: string;
  will: string;
  witness: string;
  stoodOn?: string | null;
  notes?: string | null;
  href?: string;
};

export function willWitnessLine(witness?: string | null, stoodOn?: string | null) {
  const who = witness?.trim() || "A witness";
  const when = stoodOn?.trim();
  return when ? `${who} stood on ${when}` : `${who} stood for the will`;
}

export function willWitnessesHeading(count: number) {
  if (!count) return "No will witnesses yet";
  if (count === 1) return "1 will witness";
  return `${count} will witnesses`;
}

export function missingWillWitnessesHeading(count: number) {
  if (!count) return "Every will already has a witness";
  if (count === 1) return "1 will still needs a witness";
  return `${count} wills still need a witness`;
}

export function compileWillWitnesses(rows: WillWitnessRow[]) {
  return [...rows].sort(
    (a, b) =>
      (a.stoodOn || "9999-12-31").localeCompare(b.stoodOn || "9999-12-31") ||
      a.witness.localeCompare(b.witness) ||
      a.will.localeCompare(b.will),
  );
}
