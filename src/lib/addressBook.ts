import { hideMinorDetails, isLiving } from "@/lib/privacy";
import { Role } from "@prisma/client";

export function addressBookHeading(count: number) {
  if (!count) return "No living relatives in the address book";
  if (count === 1) return "Address book · 1 living relative";
  return `Address book · ${count} living relatives`;
}

export function addressBookLine(name: string, line?: string | null, phone?: string | null) {
  const who = name.trim() || "A relative";
  const street = line?.trim();
  const number = phone?.trim();
  if (street && number) return `${who} · ${street} · ${number}`;
  if (street) return `${who} · ${street}`;
  if (number) return `${who} · ${number}`;
  return `${who} · address not written yet`;
}

export function missingAddressHeading(count: number) {
  if (!count) return "Every living relative has an address";
  if (count === 1) return "1 living relative still needs an address";
  return `${count} living relatives still need an address`;
}

export function compileAddressBook<
  T extends {
    id: string;
    displayName: string;
    deathDate?: Date | string | null;
    birthDate?: Date | string | null;
  },
>(
  people: T[],
  addresses: Array<{ personId?: string | null; line: string; locality?: string | null; region?: string | null }>,
  phones: Array<{ personId: string; phone: string }> = [],
  role: Role = Role.contributor,
) {
  const living = people.filter((person) => isLiving(person) && !hideMinorDetails(role, person));
  return [...living]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((person) => {
      const address = addresses.find((row) => row.personId === person.id);
      const phone = phones.find((row) => row.personId === person.id);
      const street = [address?.line, address?.locality, address?.region].filter(Boolean).join(", ");
      return {
        id: person.id,
        displayName: person.displayName,
        line: street || null,
        phone: phone?.phone || null,
        href: `/people/${person.id}`,
        printed: addressBookLine(person.displayName, street || null, phone?.phone || null),
      };
    });
}
