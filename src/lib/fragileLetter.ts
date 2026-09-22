export function fragileOriginalLabel() {
  return "Fragile original";
}

export function fragileLettersHeading(count: number) {
  if (!count) return "No letters marked as fragile originals";
  if (count === 1) return "1 fragile original";
  return `${count} fragile originals`;
}

export function notFragileHeading(count: number) {
  if (!count) return "Every letter is marked as a fragile original";
  if (count === 1) return "1 letter is not marked fragile";
  return `${count} letters are not marked fragile`;
}

export function isFragileOriginal(letter: { fragileOriginal?: boolean | null }) {
  return Boolean(letter.fragileOriginal);
}
