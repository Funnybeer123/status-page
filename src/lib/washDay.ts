const weekdayOrder: Record<string, string> = {
  monday: "01",
  tuesday: "02",
  wednesday: "03",
  thursday: "04",
  friday: "05",
  saturday: "06",
  sunday: "07",
};

export function washDaySortKey(weekday?: string | null) {
  const key = weekday?.trim().toLowerCase() || "";
  return weekdayOrder[key] || `08-${key || "9999"}`;
}

export function washDayLine(person?: string | null, weekday?: string | null) {
  const who = person?.trim() || "A household";
  const day = weekday?.trim() || "wash day";
  return `${who} · ${day}`;
}

export function washDaysHeading(count: number) {
  if (!count) return "No wash-day schedule yet";
  if (count === 1) return "1 wash-day household";
  return `${count} wash-day households`;
}

export function missingWashHeading(count: number) {
  return count ? "The wash-day schedule is still empty" : "The wash-day schedule already has a household";
}

export function compileWashDays<T extends { weekday: string; person: string }>(rows: T[]) {
  return [...rows].sort((a, b) => washDaySortKey(a.weekday).localeCompare(washDaySortKey(b.weekday)) || a.person.localeCompare(b.person));
}
