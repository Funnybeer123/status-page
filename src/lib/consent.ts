import { isLivingAdult, type SharePerson } from "@/lib/privacy";

export type ConsentRow = { personId: string; granted: boolean };

export function grantedConsentIds(consents: ConsentRow[]) {
  return consents.filter((row) => row.granted).map((row) => row.personId);
}

export function needsShareConsent(person: SharePerson & { id: string }, consentedIds: Iterable<string>) {
  if (!isLivingAdult(person)) return false;
  const granted = consentedIds instanceof Set ? consentedIds : new Set(consentedIds);
  return !granted.has(person.id);
}

export function livingAdultsNeedingConsent<T extends SharePerson & { id: string; displayName: string }>(
  people: T[],
  consents: ConsentRow[],
) {
  const granted = new Set(grantedConsentIds(consents));
  return people.filter((person) => needsShareConsent(person, granted));
}

export function consentHeading(missing: number) {
  if (!missing) return "Every living adult has a consent record";
  if (missing === 1) return "1 living adult still needs consent";
  return `${missing} living adults still need consent`;
}
