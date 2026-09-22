export function meetingHeading(count: number) {
  if (!count) return "No family meeting notes yet";
  if (count === 1) return "1 family meeting";
  return `${count} family meetings`;
}

export function meetingLine(title: string, when?: string | null) {
  const name = title.trim() || "Family meeting";
  return when?.trim() ? `${name} · ${when.trim()}` : name;
}

export function meetingNotesLine(notes: string) {
  return notes.trim() || "No notes were written down.";
}

export function attendeesLine(names: string[]) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (!cleaned.length) return "No one was listed";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned.at(-1)}`;
}
