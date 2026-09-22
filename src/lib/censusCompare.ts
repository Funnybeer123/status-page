export type HouseholdMember = {
  personId: string;
  name: string;
  role?: string | null;
  age?: number | null;
  occupation?: string | null;
};

export function householdKey(place: string, street?: string | null) {
  const bits = [place, street].map((part) => (part || "").trim().toLowerCase()).filter(Boolean);
  return bits.join(" / ") || "household";
}

export function householdHeading(place: string, year: number, street?: string | null) {
  return street ? `${place}, ${year} · ${street}` : `${place}, ${year}`;
}

export function compareHeading(place: string, earlierYear: number, laterYear: number) {
  return `${place}: ${earlierYear} and ${laterYear}`;
}

export function compareHouseholds(earlier: HouseholdMember[], later: HouseholdMember[]) {
  const earlierIds = new Set(earlier.map((row) => row.personId));
  const laterIds = new Set(later.map((row) => row.personId));
  return {
    stay: later.filter((row) => earlierIds.has(row.personId)),
    arrive: later.filter((row) => !earlierIds.has(row.personId)),
    leave: earlier.filter((row) => !laterIds.has(row.personId)),
  };
}

export function memberLine(member: HouseholdMember) {
  const bits = [member.name];
  if (member.role) bits.push(member.role);
  if (member.age != null) bits.push(`age ${member.age}`);
  if (member.occupation) bits.push(member.occupation);
  return bits.join(" · ");
}

export function censusOccupations(members: HouseholdMember[]) {
  return members
    .filter((member) => member.occupation?.trim())
    .map((member) => ({
      personId: member.personId,
      name: member.name,
      occupation: member.occupation!.trim(),
    }));
}
