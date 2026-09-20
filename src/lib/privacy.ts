import { Role } from "@prisma/client";
import { hasAtLeast } from "@/lib/roles";

export function isLiving(person?: { deathDate?: Date | string | null } | null) {
  return Boolean(person) && !person?.deathDate;
}

export function canSeeLivingFacts(role: Role) {
  return hasAtLeast(role, Role.contributor);
}

export function shouldHideLivingFacts(role: Role, person?: { deathDate?: Date | string | null } | null) {
  return isLiving(person) && !canSeeLivingFacts(role);
}

export function redactPerson<T extends { deathDate?: Date | string | null; birthDate?: Date | string | null; notes?: string | null }>(
  person: T,
  role: Role,
): T {
  if (!shouldHideLivingFacts(role, person)) return person;
  return {
    ...person,
    birthDate: null,
    notes: null,
  };
}

export function redactPeople<T extends { deathDate?: Date | string | null; birthDate?: Date | string | null; notes?: string | null }>(
  people: T[],
  role: Role,
) {
  return people.map((person) => redactPerson(person, role));
}

export function hideResidenceForViewer(role: Role, person?: { deathDate?: Date | string | null } | null) {
  return shouldHideLivingFacts(role, person);
}

export function hideEventFromViewer(
  role: Role,
  event: { kind: string; person?: { deathDate?: Date | string | null } | null },
) {
  if (canSeeLivingFacts(role)) return false;
  if (!isLiving(event.person)) return false;
  return event.kind === "birth" || event.kind === "residence" || event.kind === "occupation" || event.kind === "education";
}

export function redactEventDate<T extends { kind: string; happenedOn?: Date | string | null; summary?: string | null }>(
  event: T,
  role: Role,
  person?: { deathDate?: Date | string | null } | null,
): T {
  if (!shouldHideLivingFacts(role, person)) return event;
  if (event.kind === "birth" || event.kind === "residence") {
    return { ...event, happenedOn: null, summary: null };
  }
  return event;
}
