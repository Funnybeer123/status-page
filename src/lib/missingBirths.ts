export function missingBirthsHeading(count: number) {
  if (!count) return "Every person has a birth date";
  if (count === 1) return "1 person still needs a birth date";
  return `${count} people still need a birth date`;
}

export function needsBirthDate(person: { birthDate?: Date | string | null }) {
  return !person.birthDate;
}
