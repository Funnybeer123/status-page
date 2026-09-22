export const SOURCE_QUALITIES = ["original", "copy", "unsure"] as const;
export type SourceQuality = (typeof SOURCE_QUALITIES)[number];

export function isSourceQuality(value?: string | null): value is SourceQuality {
  return Boolean(value && SOURCE_QUALITIES.includes(value as SourceQuality));
}

export function qualityLabel(value?: string | null) {
  if (value === "original") return "Original";
  if (value === "copy") return "A copy";
  if (value === "unsure") return "Unsure";
  return "";
}

export function normalizeQuality(value?: string | null): SourceQuality | null {
  const trimmed = value?.trim().toLowerCase();
  return isSourceQuality(trimmed) ? trimmed : null;
}
