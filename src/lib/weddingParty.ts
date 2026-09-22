export function sameCalendarDay(a?: Date | string | null, b?: Date | string | null) {
  if (!a || !b) return false;
  const left = new Date(a);
  const right = new Date(b);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

export function weddingPartyHeading(left?: string | null, right?: string | null) {
  const a = left?.trim();
  const b = right?.trim();
  if (a && b) return `Wedding party for ${a} and ${b}`;
  if (a) return `Wedding party for ${a}`;
  return "Wedding party";
}

export function coupleLine(left?: string | null, right?: string | null) {
  const a = left?.trim() || "One of the couple";
  const b = right?.trim();
  return b ? `${a} and ${b}` : a;
}

export function witnessLine(name: string, role: string) {
  const who = name.trim() || "A relative";
  const kind = role.trim() || "witness";
  return `${who} · ${kind}`;
}

export function weddingPhotosHeading(count: number) {
  if (!count) return "No photographs of that day";
  if (count === 1) return "1 photograph of that day";
  return `${count} photographs of that day`;
}

export function missingWitnessesHeading(count: number) {
  if (!count) return "Every wedding has a witness";
  if (count === 1) return "1 wedding still needs a witness";
  return `${count} weddings still need a witness`;
}

export function missingWeddingPhotosHeading(count: number) {
  if (!count) return "Every wedding has a photograph of that day";
  if (count === 1) return "1 wedding still needs a photograph of that day";
  return `${count} weddings still need a photograph of that day`;
}
