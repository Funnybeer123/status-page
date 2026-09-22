import { formatDate, formatYear } from "@/lib/dates";

export type DateRange = {
  start?: string | null;
  end?: string | null;
  label: string;
  openStart: boolean;
  openEnd: boolean;
};

function asDate(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function addYears(date: Date, years: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

export function dateRange(
  happenedOn?: Date | string | null,
  precision?: string | null,
  rangeEnd?: Date | string | null,
  fallback = "Date unknown",
): DateRange {
  const start = asDate(happenedOn);
  const explicitEnd = asDate(rangeEnd);
  if (!start && !explicitEnd) {
    return { start: null, end: null, label: fallback, openStart: false, openEnd: false };
  }
  if (explicitEnd && start) {
    return {
      start: start.toISOString().slice(0, 10),
      end: explicitEnd.toISOString().slice(0, 10),
      label: `${formatDate(start)} – ${formatDate(explicitEnd)}`,
      openStart: false,
      openEnd: false,
    };
  }
  if (precision === "circa" && start) {
    const from = addYears(start, -1);
    const to = addYears(start, 1);
    return {
      start: from.toISOString().slice(0, 10),
      end: to.toISOString().slice(0, 10),
      label: `about ${formatYear(start)} (${formatYear(from)}–${formatYear(to)})`,
      openStart: false,
      openEnd: false,
    };
  }
  if (precision === "before" && start) {
    return {
      start: null,
      end: start.toISOString().slice(0, 10),
      label: `before ${formatDate(start)}`,
      openStart: true,
      openEnd: false,
    };
  }
  if (precision === "after" && start) {
    return {
      start: start.toISOString().slice(0, 10),
      end: null,
      label: `after ${formatDate(start)}`,
      openStart: false,
      openEnd: true,
    };
  }
  return {
    start: start ? start.toISOString().slice(0, 10) : null,
    end: start ? start.toISOString().slice(0, 10) : null,
    label: formatDate(start, fallback),
    openStart: false,
    openEnd: false,
  };
}

export function rangeBarStyle(range: DateRange, windowStart: number, windowEnd: number) {
  const from = range.start ? new Date(range.start).getUTCFullYear() : windowStart;
  const to = range.end ? new Date(range.end).getUTCFullYear() : windowEnd;
  const span = Math.max(windowEnd - windowStart, 1);
  const left = Math.max(0, ((from - windowStart) / span) * 100);
  const width = Math.max(4, ((Math.max(to, from) - from + (range.openEnd || range.openStart ? 1 : 0)) / span) * 100);
  return { left: `${left}%`, width: `${Math.min(100 - left, width)}%` };
}
