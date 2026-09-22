export const FOLD_PATTERNS = ["in thirds", "in half", "in four", "into a packet"] as const;

export function foldLine(pattern?: string | null) {
  const value = pattern?.trim();
  return value ? `Folded ${value}` : "Fold unknown";
}

export function hasFold(letter?: { foldPattern?: string | null } | null) {
  return Boolean(letter?.foldPattern?.trim());
}

export function foldHeading(count: number) {
  if (!count) return "No letter folds yet";
  if (count === 1) return "1 letter with a fold";
  return `${count} letters with a fold`;
}

export function missingFoldHeading(count: number) {
  if (!count) return "Every letter has a fold";
  if (count === 1) return "1 letter still needs a fold";
  return `${count} letters still need a fold`;
}

export function foldDiagramHeading(title?: string | null) {
  const name = title?.trim() || "This letter";
  return `How ${name} was tucked`;
}

export function foldPanelCount(pattern?: string | null) {
  const key = (pattern || "").toLowerCase();
  if (key.includes("third")) return 3;
  if (key.includes("four")) return 4;
  if (key.includes("half")) return 2;
  if (key.includes("packet")) return 3;
  return 0;
}

export function foldSteps(pattern?: string | null) {
  const key = (pattern || "").toLowerCase();
  if (key.includes("third")) return ["Lay the page flat", "Fold the bottom third up", "Fold the top third down"];
  if (key.includes("half")) return ["Lay the page flat", "Fold the page in half"];
  if (key.includes("four")) return ["Lay the page flat", "Fold in half", "Fold in half again"];
  if (key.includes("packet")) return ["Lay the page flat", "Fold in thirds", "Tuck the last flap into a packet"];
  return [];
}
