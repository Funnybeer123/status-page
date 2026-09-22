import { formatDate } from "@/lib/dates";

export type NameStyle = "given-family" | "family-given" | "display";
export type DateStyle = "day-month-year" | "month-day-year" | "year-only";

export type FamilyStyle = {
  nameStyle?: string | null;
  dateStyle?: string | null;
};

export function resolveNameStyle(value?: string | null): NameStyle {
  if (value === "family-given" || value === "given-family") return value;
  return "display";
}

export function resolveDateStyle(value?: string | null): DateStyle {
  if (value === "month-day-year" || value === "year-only") return value;
  return "day-month-year";
}

export function formatStyledName(
  person: { displayName: string; givenName?: string | null; familyName?: string | null },
  style?: string | null,
) {
  const resolved = resolveNameStyle(style);
  const given = person.givenName?.trim();
  const family = person.familyName?.trim();
  if (resolved === "family-given" && (given || family)) {
    if (family && given) return `${family}, ${given}`;
    return family || given || person.displayName;
  }
  if (resolved === "given-family" && given && family) return `${given} ${family}`;
  return person.displayName;
}

export function formatStyledDate(value?: Date | string | null, style?: string | null, fallback = "Date unknown") {
  const resolved = resolveDateStyle(style);
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  if (resolved === "year-only") return String(date.getUTCFullYear());
  if (resolved === "month-day-year") {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return formatDate(value, fallback);
}

export function styleSheetHeading() {
  return "Family style sheet";
}

export function nameStyleLabel(style?: string | null) {
  const resolved = resolveNameStyle(style);
  if (resolved === "family-given") return "Family name, given name";
  if (resolved === "given-family") return "Given name then family name";
  return "The name the family uses";
}

export function dateStyleLabel(style?: string | null) {
  const resolved = resolveDateStyle(style);
  if (resolved === "month-day-year") return "Month day, year";
  if (resolved === "year-only") return "Year only";
  return "Day month year";
}

export function styleExampleLine(name: string, date: string) {
  return `${name} · ${date}`;
}
