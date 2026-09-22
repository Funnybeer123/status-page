import { formatDate, lifespan } from "@/lib/dates";

export type PacketPerson = {
  id: string;
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  notes?: string | null;
  pronunciation?: string | null;
};

export type PacketLetter = { title: string; writtenAt?: Date | string | null; transcript: string };
export type PacketPhoto = { title?: string | null; filename: string };
export type PacketFact = { claim: string; quality?: string | null };

export function packetSlug(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "person"
  );
}

export function compilePersonFacts(input: {
  person: PacketPerson;
  letters?: PacketLetter[];
  photos?: PacketPhoto[];
  facts?: PacketFact[];
  hideLiving?: boolean;
}) {
  const { person } = input;
  const lines = [
    person.displayName,
    input.hideLiving ? "Living — some dates withheld" : lifespan(person.birthDate, person.deathDate),
  ];
  if (person.pronunciation) lines.push(`Said: ${person.pronunciation}`);
  if (!input.hideLiving && person.birthDate) lines.push(`Born ${formatDate(person.birthDate)}`);
  if (person.deathDate) lines.push(`Died ${formatDate(person.deathDate)}`);
  if (!input.hideLiving && person.notes) {
    lines.push("");
    lines.push(person.notes);
  }
  if (input.facts?.length) {
    lines.push("");
    lines.push("Facts");
    for (const fact of input.facts) {
      lines.push(`- ${fact.claim}${fact.quality ? ` (${fact.quality})` : ""}`);
    }
  }
  if (input.letters?.length) {
    lines.push("");
    lines.push("Letters");
    for (const letter of input.letters) {
      lines.push(`- ${letter.title}${letter.writtenAt ? ` · ${formatDate(letter.writtenAt)}` : ""}`);
    }
  }
  if (input.photos?.length) {
    lines.push("");
    lines.push("Photographs");
    for (const photo of input.photos) {
      lines.push(`- ${photo.title || photo.filename}`);
    }
  }
  return lines.join("\n").trim() + "\n";
}

export function packetLetterName(title: string, index: number) {
  return `letters/${String(index + 1).padStart(2, "0")}-${packetSlug(title) || "letter"}.txt`;
}

export function packetPhotoName(title: string | null | undefined, filename: string, index: number) {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `photos/${String(index + 1).padStart(2, "0")}-${packetSlug(title || filename)}${ext}`;
}
