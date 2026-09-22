import { formatDate } from "@/lib/dates";

const SCORES: Record<string, number> = {
  original: 90,
  copy: 60,
  unsure: 30,
};

export function factConfidence(qualities?: (string | null | undefined)[]) {
  if (!qualities?.length) return 0;
  const total = qualities.reduce((sum, quality) => sum + (SCORES[quality || ""] ?? 0), 0);
  return Math.round(total / qualities.length);
}

export function confidenceLabel(score: number) {
  if (score >= 80) return `Confidence ${score} · strong`;
  if (score >= 50) return `Confidence ${score} · fair`;
  if (score > 0) return `Confidence ${score} · thin`;
  return "Confidence 0 · no sources yet";
}

export function preferredDateLine(when?: Date | string | null, score = 0) {
  return `Preferred date · ${formatDate(when, "Date unknown")} · ${confidenceLabel(score)}`;
}

export function preferredDatesHeading(count: number) {
  if (!count) return "No preferred dates yet";
  if (count === 1) return "1 preferred date";
  return `${count} preferred dates`;
}

export function barePreferredHeading(count: number) {
  if (!count) return "Every preferred date has a source";
  if (count === 1) return "1 preferred date still needs a source";
  return `${count} preferred dates still need a source`;
}

export function compilePreferredDates<
  T extends {
    id: string;
    title: string;
    happenedOn?: Date | string | null;
    person?: { id?: string; displayName?: string | null } | null;
    citations?: { quality?: string | null }[] | null;
  },
>(events: T[]) {
  return events.map((event) => {
    const score = factConfidence((event.citations || []).map((citation) => citation.quality));
    return {
      id: event.id,
      title: event.title,
      personId: event.person?.id || "",
      personName: event.person?.displayName || "A relative",
      score,
      line: preferredDateLine(event.happenedOn, score),
      href: event.person?.id ? `/people/${event.person.id}` : "/dates/preferred",
    };
  });
}
