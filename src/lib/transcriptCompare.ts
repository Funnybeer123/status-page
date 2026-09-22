export function compareHeading() {
  return "Side-by-side transcript";
}

export function compareSideLabel(side: "current" | "earlier") {
  return side === "current" ? "Current transcript" : "Earlier transcript";
}

export function hasEdits(revisions?: unknown[] | null) {
  return Boolean(revisions && revisions.length);
}

export function latestRevision<T extends { editedAt: Date | string }>(revisions: T[]) {
  return [...revisions].sort((a, b) => String(b.editedAt).localeCompare(String(a.editedAt)))[0] ?? null;
}

export function editedLettersHeading(count: number) {
  if (!count) return "No letters have been edited yet";
  if (count === 1) return "1 letter has an earlier transcript";
  return `${count} letters have earlier transcripts`;
}
