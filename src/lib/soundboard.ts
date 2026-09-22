export function soundboardHeading(count: number) {
  if (!count) return "No spoken names on the soundboard yet";
  if (count === 1) return "1 spoken name on the soundboard";
  return `${count} spoken names on the soundboard`;
}

export function missingSpokenHeading(count: number) {
  if (!count) return "Every name has a spoken pronunciation";
  if (count === 1) return "1 person still needs a spoken name";
  return `${count} people still need a spoken name`;
}

export function spokenNameLine(name: string, said?: string | null) {
  return said?.trim() ? `${name} · ${said.trim()}` : name;
}
