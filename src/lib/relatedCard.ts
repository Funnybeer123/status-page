import type { RelatedResult } from "@/lib/related";

export function relatedCardHeading(from?: string | null, to?: string | null) {
  const a = from?.trim() || "Someone";
  const b = to?.trim() || "someone";
  return `How we are related · ${a} · ${b}`;
}

export function relatedCardLine(result?: Pick<RelatedResult, "sentence" | "found"> | null) {
  if (!result) return "Choose two people to print how they are related.";
  return result.found ? result.sentence : result.sentence;
}

export function missingRelatedCardHeading() {
  return "Choose two people for a related card";
}

export function samePersonCardHeading(name?: string | null) {
  const who = name?.trim() || "This relative";
  return `${who} is the same person`;
}
