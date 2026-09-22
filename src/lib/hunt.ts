export type HuntTargetKind = "letter" | "photo" | "place";

export type HuntClueInput = {
  clue: string;
  targetKind: HuntTargetKind | string;
  answer: string;
  citation?: string | null;
  documentTitle?: string | null;
  assetTitle?: string | null;
  placeName?: string | null;
};

export function huntHeading(title: string, clueCount: number) {
  const name = title.trim() || "Family scavenger hunt";
  if (!clueCount) return `${name} — no clues yet`;
  if (clueCount === 1) return `${name} — 1 clue`;
  return `${name} — ${clueCount} clues`;
}

export function huntsIndexHeading(count: number) {
  if (!count) return "No scavenger hunts yet";
  if (count === 1) return "1 family scavenger hunt";
  return `${count} family scavenger hunts`;
}

export function emptyHuntsHeading(count: number) {
  if (!count) return "Every hunt has a clue";
  if (count === 1) return "1 hunt still needs a clue";
  return `${count} hunts still need a clue`;
}

export function clueCitationLine(clue: HuntClueInput) {
  const cited =
    clue.citation?.trim() ||
    clue.documentTitle?.trim() ||
    clue.assetTitle?.trim() ||
    clue.placeName?.trim() ||
    clue.answer.trim();
  return `Cited from the archive: ${cited}`;
}

export function clueAnswerHref(clue: {
  targetKind: string;
  documentId?: string | null;
  assetId?: string | null;
  placeId?: string | null;
}) {
  if (clue.targetKind === "letter" && clue.documentId) return `/letters/${clue.documentId}`;
  if (clue.targetKind === "photo" && clue.assetId) return `/archive/${clue.assetId}`;
  if (clue.targetKind === "place" && clue.placeId) return `/places/${clue.placeId}`;
  if (clue.documentId) return `/letters/${clue.documentId}`;
  if (clue.assetId) return `/archive/${clue.assetId}`;
  if (clue.placeId) return `/places/${clue.placeId}`;
  return "/hunts";
}

export function compileHuntClue(clue: HuntClueInput & { id: string }) {
  return {
    id: clue.id,
    clue: clue.clue.trim(),
    targetKind: clue.targetKind,
    answer: clue.answer.trim(),
    citation: clueCitationLine(clue),
  };
}

export function uncitedCluesHeading(count: number) {
  if (!count) return "Every clue cites the archive";
  if (count === 1) return "1 clue still needs an archive citation";
  return `${count} clues still need an archive citation`;
}
