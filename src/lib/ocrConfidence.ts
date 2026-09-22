export function clampOcrConfidence(value?: number | string | null) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function ocrConfidenceLine(score?: number | null) {
  if (score == null) return "OCR confidence not scored yet";
  if (score >= 80) return `OCR confidence ${score} · looks clear`;
  if (score >= 50) return `OCR confidence ${score} · needs a second look`;
  return `OCR confidence ${score} · still hard to read`;
}

export function ocrConfidenceHeading(count: number) {
  if (!count) return "No letter pages waiting on a confidence score";
  if (count === 1) return "1 letter page still needs an OCR confidence score";
  return `${count} letter pages still need an OCR confidence score`;
}

export function needsOcrConfidence(row: { needsReview?: boolean | null; ocrConfidence?: number | null }) {
  return Boolean(row.needsReview) && row.ocrConfidence == null;
}
