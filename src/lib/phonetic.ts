const CODES: Record<string, string> = {
  b: "1",
  f: "1",
  p: "1",
  v: "1",
  c: "2",
  g: "2",
  j: "2",
  k: "2",
  q: "2",
  s: "2",
  x: "2",
  z: "2",
  d: "3",
  t: "3",
  l: "4",
  m: "5",
  n: "5",
  r: "6",
};

export function soundex(value?: string | null) {
  const letters = (value || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return "";
  let code = letters[0]!.toUpperCase();
  let previous = CODES[letters[0]!] || "";
  for (const letter of letters.slice(1)) {
    const next = CODES[letter] || "";
    if (!next) {
      if (letter !== "h" && letter !== "w") previous = "";
      continue;
    }
    if (next !== previous) code += next;
    previous = next;
    if (code.length >= 4) break;
  }
  return `${code}000`.slice(0, 4);
}

export function phoneticTokens(name?: string | null) {
  return (name || "")
    .split(/[\s,'-]+/)
    .map((part) => soundex(part))
    .filter(Boolean);
}

export function soundsLike(query: string, name?: string | null) {
  const wanted = new Set(phoneticTokens(query));
  if (!wanted.size) return false;
  return phoneticTokens(name).some((token) => wanted.has(token));
}

export function phoneticPeople<T extends { displayName: string; givenName?: string | null; familyName?: string | null; names?: { name: string }[] }>(
  query: string,
  people: T[],
) {
  return people.filter(
    (person) =>
      soundsLike(query, person.displayName) ||
      soundsLike(query, person.givenName) ||
      soundsLike(query, person.familyName) ||
      (person.names ?? []).some((name) => soundsLike(query, name.name)),
  );
}

export function phoneticHeading(query: string, count: number) {
  if (!count) return `No names sound like “${query}”`;
  if (count === 1) return `1 name sounds like “${query}”`;
  return `${count} names sound like “${query}”`;
}
