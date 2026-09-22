export function thankYouHeading() {
  return "A thank-you note";
}

export function thankYouEmpty() {
  return "Nothing has been added yet to thank anyone for.";
}

export function thankYouNote(input: { actorName?: string | null; title?: string | null; verb?: string | null }) {
  const who = input.actorName?.trim() || "a relative";
  const title = input.title?.trim() || "something";
  const verb = input.verb?.trim() || "added";
  return `Dear ${who},\n\nThank you for ${verb} ${title}. The family will keep it with the letters and photographs.\n\nWith love,\nThe family`;
}

export function thankYouLine(input: { actorName?: string | null; title?: string | null }) {
  const who = input.actorName?.trim() || "A relative";
  const title = input.title?.trim() || "something";
  return `${who} · ${title}`;
}
