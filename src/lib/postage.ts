export function postageLine(cost?: string | null) {
  const value = cost?.trim();
  return value ? `Postage · ${value}` : "Postage unknown";
}

export function hasPostage(letter?: { postage?: string | null } | null) {
  return Boolean(letter?.postage?.trim());
}

export function postageHeading(count: number) {
  if (!count) return "No postage costs yet";
  if (count === 1) return "1 letter with a postage cost";
  return `${count} letters with a postage cost`;
}

export function missingPostageHeading(count: number) {
  if (!count) return "Every letter has a postage cost";
  if (count === 1) return "1 letter still needs a postage cost";
  return `${count} letters still need a postage cost`;
}

export function postageLedgerHeading(count: number) {
  if (!count) return "The postage ledger is empty";
  if (count === 1) return "Postage ledger · 1 letter";
  return `Postage ledger · ${count} letters`;
}
