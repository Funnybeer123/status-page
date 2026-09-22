import { Role } from "@prisma/client";
import { ageAt } from "@/lib/dates";
import { hasAtLeast } from "@/lib/roles";

export type Audience = Role | "share";

export function isLiving(person?: { deathDate?: Date | string | null } | null) {
  return Boolean(person) && !person?.deathDate;
}

export function isLivingMinor(
  person?: { deathDate?: Date | string | null; birthDate?: Date | string | null } | null,
  on = new Date(),
) {
  if (!isLiving(person) || !person?.birthDate) return false;
  const age = ageAt(person.birthDate, on);
  return age != null && age < 18;
}

export function hideMinorDetails(
  audience: Audience,
  person?: { deathDate?: Date | string | null; birthDate?: Date | string | null } | null,
) {
  if (!isLivingMinor(person)) return false;
  if (audience === "share") return true;
  return !canSeeLivingFacts(audience);
}

export type SharePerson = {
  id?: string;
  deathDate?: Date | string | null;
  birthDate?: Date | string | null;
};

export function isLivingAdult(person?: SharePerson | null, on = new Date()) {
  return isLiving(person) && !isLivingMinor(person, on);
}

export function hideAdultWithoutConsent(
  audience: Audience,
  person?: SharePerson | null,
  consentedIds: Iterable<string> = [],
) {
  if (audience !== "share") return false;
  if (!isLivingAdult(person)) return false;
  if (!person?.id) return true;
  const granted = consentedIds instanceof Set ? consentedIds : new Set(consentedIds);
  return !granted.has(person.id);
}

export function hidePhotoFromAudience(
  audience: Audience,
  tagged: SharePerson[],
  consentedIds: Iterable<string> = [],
) {
  return tagged.some(
    (person) => hideMinorDetails(audience, person) || hideAdultWithoutConsent(audience, person, consentedIds),
  );
}

export function filterAssetsForAudience<
  T extends { tags: { person: SharePerson }[] },
>(assets: T[], audience: Audience, consentedIds: Iterable<string> = []) {
  return assets.filter((asset) => !hidePhotoFromAudience(audience, asset.tags.map((tag) => tag.person), consentedIds));
}

export function canSeeLivingFacts(role: Role) {
  return hasAtLeast(role, Role.contributor);
}

export function shouldHideLivingFacts(role: Role, person?: { deathDate?: Date | string | null } | null) {
  return isLiving(person) && !canSeeLivingFacts(role);
}

export function canSeeOwnerNote(role: Role) {
  return role === Role.owner;
}

export function redactOwnerNote<T extends { ownerNote?: string | null }>(person: T, role: Role): T {
  if (canSeeOwnerNote(role)) return person;
  return { ...person, ownerNote: null };
}

export function redactPerson<T extends { deathDate?: Date | string | null; birthDate?: Date | string | null; notes?: string | null; ownerNote?: string | null }>(
  person: T,
  role: Role,
): T {
  const hiddenNote = redactOwnerNote(person, role);
  if (!shouldHideLivingFacts(role, person)) return hiddenNote;
  return {
    ...hiddenNote,
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
  return (
    event.kind === "birth" ||
    event.kind === "residence" ||
    event.kind === "occupation" ||
    event.kind === "education" ||
    event.kind === "religion" ||
    event.kind === "census" ||
    event.kind === "naturalization"
  );
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
