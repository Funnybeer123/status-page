export function directoryHeading(place: string, year: number) {
  return `${place}, ${year}`;
}

export function directoryLine(entry: { name: string; occupation?: string | null; address: string; year: number }) {
  return [entry.name, entry.occupation, entry.address, String(entry.year)].filter(Boolean).join(" · ");
}

export function normalizePaperKind(kind?: string | null) {
  const value = (kind || "").trim().toLowerCase();
  if (value === "pension" || value === "pension record") return "pension";
  return "draft";
}

export function paperHeading(kind: string, name: string) {
  return `${normalizePaperKind(kind) === "pension" ? "Pension" : "Draft"} record · ${name}`;
}

export function paperLine(kind: string, name: string, year?: number | null) {
  return year ? `${paperHeading(kind, name)} · ${year}` : paperHeading(kind, name);
}

export function classHeading(school: string, year: number) {
  return `${school}, class of ${year}`;
}

export function classLine(names: string[]) {
  return names.length ? names.join(", ") : "No pupils recorded.";
}

export function thereHeading(count: number) {
  if (!count) return "No one has said they were there";
  if (count === 1) return "1 relative was there";
  return `${count} relatives were there`;
}

export function thereLine(name: string, eventTitle: string) {
  return `${name} was there · ${eventTitle}`;
}

export function bannerHeading(familyName: string) {
  return `${familyName} family banner`;
}

export function assignedHeading(name: string, count: number) {
  if (!count) return `Nothing assigned to ${name}`;
  if (count === 1) return `1 thing assigned to ${name}`;
  return `${count} things assigned to ${name}`;
}
