export function guestBookHeading(count: number) {
  if (!count) return "The family guest book is empty";
  if (count === 1) return "1 note in the guest book";
  return `${count} notes in the guest book`;
}

export function emptyGuestBookHeading() {
  return "No visiting relatives have signed the guest book yet";
}

export function guestBookLine(author?: string | null, body?: string | null) {
  const who = author?.trim() || "A relative";
  const note = body?.trim() || "Came to visit.";
  return `${who}: ${note}`;
}
