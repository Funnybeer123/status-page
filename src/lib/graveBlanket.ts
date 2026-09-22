export function blanketLine(person?: string | null, monthDay?: string | null, placedBy?: string | null) {
  const grave = person?.trim() || "A grave";
  const when = monthDay?.trim() || "a date";
  const who = placedBy?.trim();
  return who ? `${grave} · ${when} · placed by ${who}` : `${grave} · ${when}`;
}

export function blanketsHeading(count: number) {
  if (!count) return "No grave-blanket schedule yet";
  if (count === 1) return "1 grave-blanket date";
  return `${count} grave-blanket dates`;
}

export function missingBlanketsHeading(count: number) {
  return count ? "The grave-blanket schedule is still empty" : "The grave-blanket schedule already has a date";
}

export function compileBlankets<T extends { monthDay: string; person: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.monthDay.localeCompare(b.monthDay) || a.person.localeCompare(b.person));
}
