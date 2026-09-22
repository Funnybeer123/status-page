import { formatDate } from "@/lib/dates";

export function postmarkHeading(title?: string | null) {
  return `Postmark · ${title?.trim() || "a letter"}`;
}

export function postmarkLine(stamp?: string | null, when?: Date | string | null) {
  const mark = stamp?.trim() || "Unmarked stamp";
  return `${mark} · ${formatDate(when, "No postmark date")}`;
}

export function hasPostmark(letter: { postmarkedAt?: Date | string | null; stampText?: string | null }) {
  return Boolean(letter.postmarkedAt || letter.stampText?.trim());
}

export function missingPostmarkHeading(count: number) {
  if (!count) return "Every letter has a postmark";
  if (count === 1) return "1 letter still needs a postmark";
  return `${count} letters still need a postmark`;
}

export function postmarksHeading(count: number) {
  if (!count) return "No postmarks yet";
  if (count === 1) return "1 letter postmark";
  return `${count} letter postmarks`;
}

export function postmarkWrittenLine(
  written?: Date | string | null,
  stamp?: string | null,
  postmarked?: Date | string | null,
) {
  return `Written ${formatDate(written, "Undated")} · ${postmarkLine(stamp, postmarked)}`;
}

export function undatedWrittenHeading(count: number) {
  if (!count) return "Every postmarked letter has a written date";
  if (count === 1) return "1 postmarked letter still needs a written date";
  return `${count} postmarked letters still need a written date`;
}
