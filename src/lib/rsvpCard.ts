import { formatDate } from "@/lib/dates";

export function rsvpCardHeading(title?: string | null) {
  return `RSVP card · ${title?.trim() || "the reunion"}`;
}

export function rsvpCardLine(name?: string | null, coming?: boolean | null) {
  const who = name?.trim() || "A relative";
  return coming ? `${who} will be there` : `${who} cannot come`;
}

export function rsvpCardsHeading(count: number) {
  if (!count) return "No RSVP cards yet";
  if (count === 1) return "1 printable RSVP card";
  return `${count} printable RSVP cards`;
}

export function missingRsvpHeading(count: number) {
  if (!count) return "Every reunion has an RSVP";
  if (count === 1) return "1 reunion still needs an RSVP";
  return `${count} reunions still need an RSVP`;
}

export function rsvpWhenLine(title?: string | null, when?: Date | string | null, place?: string | null) {
  return [title?.trim() || "A reunion", formatDate(when, "Date unset"), place?.trim() || ""]
    .filter(Boolean)
    .join(" · ");
}

export function compileRsvpCard<
  T extends { person?: { displayName?: string | null } | null; coming?: boolean | null },
>(reunion: { title?: string | null; happenedOn?: Date | string | null; place?: string | null }, guests: T[]) {
  return {
    heading: rsvpCardHeading(reunion.title),
    when: rsvpWhenLine(reunion.title, reunion.happenedOn, reunion.place),
    guests: guests.map((guest) => ({
      name: guest.person?.displayName || "A relative",
      coming: Boolean(guest.coming),
      line: rsvpCardLine(guest.person?.displayName, guest.coming),
    })),
  };
}
