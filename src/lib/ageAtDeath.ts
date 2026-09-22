import { ageAt, formatDate, lifespan } from "@/lib/dates";

export function compileAgesAtDeath(
  people: { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null }[],
) {
  return people
    .filter((person) => person.birthDate && person.deathDate)
    .map((person) => ({
      id: person.id,
      name: person.displayName,
      dates: lifespan(person.birthDate, person.deathDate),
      died: formatDate(person.deathDate),
      age: ageAt(person.birthDate, person.deathDate),
    }))
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
}
