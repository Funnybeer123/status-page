import { compilePersonFacts, packetSlug, type PacketFact, type PacketLetter, type PacketPerson, type PacketPhoto } from "@/lib/personPacket";
import type { PdfChapter } from "@/lib/pdf";

export function bookletHeading(name: string) {
  return `Packet booklet for ${name.trim() || "this person"}`;
}

export function bookletFilename(name: string) {
  return `${packetSlug(name)}-booklet.pdf`;
}

export function missingLettersBookletHeading(count: number) {
  if (!count) return "Every packet booklet has a letter";
  if (count === 1) return "1 packet booklet still needs a letter";
  return `${count} packet booklets still need a letter`;
}

export function compilePacketBooklet(input: {
  person: PacketPerson;
  letters?: PacketLetter[];
  photos?: PacketPhoto[];
  facts?: PacketFact[];
  hideLiving?: boolean;
}): PdfChapter[] {
  const facts = compilePersonFacts(input);
  const letters = input.letters ?? [];
  return [
    {
      title: bookletHeading(input.person.displayName),
      subtitle: "A printable packet of facts, letters, and photographs",
      sections: [
        { heading: "Facts the family kept", body: facts },
        {
          heading: letters.length ? `${letters.length} letters` : "No letters in this packet",
          body: letters.map((letter) => letter.title).join(" · ") || undefined,
        },
        {
          heading: input.photos?.length ? `${input.photos.length} photographs` : "No photographs in this packet",
          body: input.photos?.map((photo) => photo.title || photo.filename).join(" · ") || undefined,
        },
      ],
    },
    ...letters.map((letter) => ({
      title: letter.title,
      sections: [{ heading: letter.title, body: letter.transcript }],
    })),
  ];
}
