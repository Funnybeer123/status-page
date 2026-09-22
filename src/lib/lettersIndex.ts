export function lettersIndexHeading(count: number) {
  if (!count) return "No letters in the family yet";
  if (count === 1) return "1 letter in the family, in date order";
  return `${count} letters in the family, in date order`;
}

export function undatedLettersHeading(count: number) {
  if (!count) return "Every letter has a date";
  if (count === 1) return "1 letter still needs a date";
  return `${count} letters still need a date`;
}

export function letterIndexLine(title: string, dated?: string | null) {
  return dated?.trim() ? `${title.trim()} · ${dated.trim()}` : `${title.trim() || "A letter"} · Undated`;
}

export function sortLettersByDate<T extends { writtenAt?: Date | string | null; createdAt?: Date | string | null }>(
  letters: T[],
) {
  return [...letters].sort((a, b) => {
    if (!a.writtenAt && !b.writtenAt) return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    if (!a.writtenAt) return 1;
    if (!b.writtenAt) return -1;
    return String(a.writtenAt).localeCompare(String(b.writtenAt));
  });
}
