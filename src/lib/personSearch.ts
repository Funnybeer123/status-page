export type PersonSearchHit = {
  id: string;
  kind: "story" | "letter" | "photo" | "event" | "note" | "chapter";
  title: string;
  snippet?: string | null;
  href: string;
};

export function searchTokens(query?: string | null) {
  return (query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function matchesQuery(haystack: string, tokens: string[]) {
  if (!tokens.length) return false;
  const text = haystack.toLowerCase();
  return tokens.every((token) => text.includes(token));
}

function snippetAround(text: string, tokens: string[]) {
  const lower = text.toLowerCase();
  const first = tokens.map((token) => lower.indexOf(token)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, first - 40);
  const slice = text.slice(start, start + 160).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + 160 < text.length ? "…" : ""}`;
}

export function searchPersonItems(
  items: { id: string; kind: PersonSearchHit["kind"]; title: string; body?: string | null; href: string }[],
  query?: string | null,
): PersonSearchHit[] {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  return items
    .filter((item) => matchesQuery(`${item.title} ${item.body || ""}`, tokens))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      href: item.href,
      snippet: item.body ? snippetAround(item.body, tokens) : null,
    }));
}

export function personSearchHeading(query: string, count: number) {
  const q = query.trim();
  if (!q) return "Search this life";
  if (!count) return `Nothing in this life for “${q}”`;
  if (count === 1) return `1 place “${q}” turns up`;
  return `${count} places “${q}” turns up`;
}
