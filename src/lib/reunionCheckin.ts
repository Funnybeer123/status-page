import { formatDate } from "@/lib/dates";

export function checkinHeading(title?: string | null, arrived = 0, total = 0) {
  const name = title?.trim() || "the reunion";
  return `Check-in · ${name} · ${arrived} of ${total} arrived`;
}

export function arrivedLine(name?: string | null, when?: Date | string | null) {
  const who = name?.trim() || "A guest";
  if (!when) return `${who} has not arrived`;
  return `${who} arrived · ${formatDate(when)}`;
}

export function missingCheckinHeading(count: number) {
  if (!count) return "Every guest has checked in";
  if (count === 1) return "1 guest still needs to check in";
  return `${count} guests still need to check in`;
}

export function kioskArrivedLine(names: string[]) {
  return names.filter(Boolean).join(" · ") || "No one has checked in yet.";
}

export function compileCheckin<
  T extends {
    arrived?: boolean | null;
    arrivedAt?: Date | string | null;
    coming?: boolean | null;
    person: { id: string; displayName: string };
  },
>(guests: T[]) {
  return [...guests]
    .sort((a, b) => {
      const left = a.arrivedAt ? new Date(a.arrivedAt).toISOString() : "9999-";
      const right = b.arrivedAt ? new Date(b.arrivedAt).toISOString() : "9999-";
      return left.localeCompare(right) || a.person.displayName.localeCompare(b.person.displayName);
    })
    .map((guest) => ({
      personId: guest.person.id,
      name: guest.person.displayName,
      arrived: Boolean(guest.arrived),
      arrivedAt: guest.arrivedAt || null,
      coming: guest.coming !== false,
      line: arrivedLine(guest.person.displayName, guest.arrived ? guest.arrivedAt : null),
    }));
}
