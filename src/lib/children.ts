import { ageAt } from "@/lib/dates";
import { isLivingMinor } from "@/lib/privacy";

export function livingMinors<
  T extends { id: string; displayName: string; birthDate?: Date | string | null; deathDate?: Date | string | null },
>(people: T[], on = new Date()) {
  return people
    .filter((person) => isLivingMinor(person, on))
    .map((person) => ({
      ...person,
      age: ageAt(person.birthDate, on),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function childPublicName(person: { givenName?: string | null; displayName?: string | null }) {
  return person.givenName?.trim() || "A living child";
}
