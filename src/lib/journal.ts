export function journalHeading(count: number, shared = 0) {
  if (!count) return "No private journal yet";
  if (shared === count) return `${count === 1 ? "1 entry" : `${count} entries`}, all shared as stories`;
  const hidden = count - shared;
  if (hidden === 1) return "1 journal entry still private";
  return `${hidden} journal entries still private`;
}

export function journalLine(title: string, shared: boolean) {
  return shared ? `${title} · shared as a story` : `${title} · still private`;
}

export function journalSharedHeading(count: number) {
  if (!count) return "No journal entries shared as stories";
  if (count === 1) return "1 journal entry shared as a story";
  return `${count} journal entries shared as stories`;
}
