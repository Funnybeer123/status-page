import { ageAt } from "@/lib/dates";

export const MILESTONE_AGES = [80, 90, 100] as const;

export type MilestonePerson = {
  id: string;
  displayName: string;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
};

export function ageInYear(birth?: Date | string | null, year = new Date().getUTCFullYear()) {
  if (!birth) return null;
  const date = typeof birth === "string" ? new Date(birth) : birth;
  if (Number.isNaN(date.getTime())) return null;
  return year - date.getUTCFullYear();
}

export function milestoneBirthdays(people: MilestonePerson[], year = new Date().getUTCFullYear()) {
  return people
    .filter((person) => !person.deathDate)
    .map((person) => {
      const age = ageInYear(person.birthDate, year);
      return { ...person, age, year };
    })
    .filter((row): row is typeof row & { age: number } => Boolean(row.age && MILESTONE_AGES.includes(row.age as (typeof MILESTONE_AGES)[number])))
    .sort((a, b) => b.age - a.age || a.displayName.localeCompare(b.displayName));
}

export function milestoneHeading(year: number, count: number) {
  if (!count) return `No 80th, 90th, or 100th birthdays in ${year}`;
  if (count === 1) return `1 milestone birthday in ${year}`;
  return `${count} milestone birthdays in ${year}`;
}

export function milestoneLine(name: string, age: number, year: number) {
  return `${name} turns ${age} in ${year}`;
}

export function currentAge(person: MilestonePerson, on = new Date()) {
  return person.deathDate ? null : ageAt(person.birthDate, on);
}

export const ANNIVERSARY_YEARS = [1, 10, 25, 50, 75, 100] as const;

export function yearsSince(date?: Date | string | null, year = new Date().getUTCFullYear()) {
  if (!date) return null;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return year - value.getUTCFullYear();
}

export function deathAnniversaries(people: MilestonePerson[], year = new Date().getUTCFullYear()) {
  return people
    .map((person) => {
      const years = yearsSince(person.deathDate, year);
      return { ...person, years, year };
    })
    .filter((row): row is typeof row & { years: number } =>
      Boolean(row.years && ANNIVERSARY_YEARS.includes(row.years as (typeof ANNIVERSARY_YEARS)[number])),
    )
    .sort((a, b) => b.years - a.years || a.displayName.localeCompare(b.displayName));
}

export function anniversaryHeading(year: number, count: number) {
  if (!count) return `No marked death anniversaries in ${year}`;
  if (count === 1) return `1 death anniversary in ${year}`;
  return `${count} death anniversaries in ${year}`;
}

export function anniversaryLine(name: string, years: number, year: number) {
  return `${name} · ${years} years in ${year}`;
}
