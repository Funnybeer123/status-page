export function utcYear(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

export function parseAliveYear(value?: string | number | null, fallback = new Date().getUTCFullYear()) {
  const year = typeof value === "number" ? value : Number(String(value || "").trim());
  if (!Number.isFinite(year)) return fallback;
  return Math.min(2100, Math.max(1000, Math.round(year)));
}

export function wasAliveInYear(
  person: { birthDate?: Date | string | null; deathDate?: Date | string | null },
  year: number,
) {
  const born = utcYear(person.birthDate);
  const died = utcYear(person.deathDate);
  if (born == null && died == null) return false;
  if (born != null && born > year) return false;
  if (died != null && died < year) return false;
  return true;
}

export function diedInYear(
  person: { deathDate?: Date | string | null },
  year: number,
) {
  return utcYear(person.deathDate) === year;
}

export function bornInYear(
  person: { birthDate?: Date | string | null },
  year: number,
) {
  return utcYear(person.birthDate) === year;
}

export function missingBirthForYear(person: { birthDate?: Date | string | null; deletedAt?: Date | string | null }) {
  return !person.deletedAt && !person.birthDate;
}

export function aliveWhenHeading(year: number, count: number) {
  if (!count) return `Who was alive in ${year} · nobody we can place`;
  if (count === 1) return `Who was alive in ${year} · 1 person`;
  return `Who was alive in ${year} · ${count} people`;
}

export function diedThatYearHeading(year: number, count: number) {
  if (!count) return `No one in the tree died in ${year}`;
  if (count === 1) return `1 person died in ${year}`;
  return `${count} people died in ${year}`;
}

export function bornThatYearHeading(year: number, count: number) {
  if (!count) return `No one in the tree was born in ${year}`;
  if (count === 1) return `1 person was born in ${year}`;
  return `${count} people were born in ${year}`;
}

export function missingAliveYearHeading(count: number) {
  if (!count) return "Everyone can be placed on the year slider";
  if (count === 1) return "1 person still needs a birth year";
  return `${count} people still need a birth year`;
}

export function highlightAliveIds<T extends { id: string; birthDate?: Date | string | null; deathDate?: Date | string | null }>(
  people: T[],
  year: number,
) {
  return people.filter((person) => wasAliveInYear(person, year)).map((person) => person.id);
}
