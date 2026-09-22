export const SUGGESTION_FIELDS = [
  "displayName",
  "givenName",
  "familyName",
  "notes",
  "birthDate",
  "deathDate",
  "pronunciation",
  "causeOfDeath",
  "languages",
  "burialPlot",
] as const;

export type SuggestionField = (typeof SUGGESTION_FIELDS)[number];

export function isSuggestionField(value?: string | null): value is SuggestionField {
  return Boolean(value && (SUGGESTION_FIELDS as readonly string[]).includes(value));
}

export function suggestionHeading(count: number) {
  if (!count) return "No corrections waiting";
  if (count === 1) return "1 correction to review";
  return `${count} corrections to review`;
}

export function suggestionLine(input: { name?: string | null; field: string; proposedValue: string }) {
  const who = input.name || "Someone";
  return `${who}: ${input.field} → ${input.proposedValue}`;
}

export function applySuggestionValue(field: SuggestionField, value: string) {
  if (field === "birthDate" || field === "deathDate") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value.trim() || null;
}

export function suggestionHistoryHeading(count: number) {
  if (!count) return "No corrections reviewed yet";
  if (count === 1) return "1 correction already reviewed";
  return `${count} corrections already reviewed`;
}
