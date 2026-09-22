import { formatDate } from "@/lib/dates";

export function envelopeHeading(title?: string | null) {
  return `Envelope · ${title?.trim() || "a letter"}`;
}

export function envelopeLine(from?: string | null, to?: string | null, when?: Date | string | null) {
  const sender = from?.trim() || "Unknown sender";
  const receiver = to?.trim() || "Unknown addressee";
  const date = formatDate(when, "Undated");
  return `${sender} to ${receiver} · ${date}`;
}

export function missingEnvelopeHeading(count: number) {
  if (!count) return "Every letter has an envelope";
  if (count === 1) return "1 letter still needs an envelope";
  return `${count} letters still need an envelope`;
}

export function hasEnvelope(letter: { envelopeFrom?: string | null; envelopeTo?: string | null; envelopeAssetId?: string | null }) {
  return Boolean(letter.envelopeFrom?.trim() || letter.envelopeTo?.trim() || letter.envelopeAssetId);
}

export function envelopesHeading(count: number) {
  if (!count) return "No letter envelopes yet";
  if (count === 1) return "1 letter envelope";
  return `${count} letter envelopes`;
}
