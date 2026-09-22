export function savedSearchHref(query: string, href?: string | null) {
  if (href?.trim()) return href.trim();
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

export function savedSearchTitle(title: string, query: string) {
  return title.trim() || query.trim() || "Saved search";
}

export function savedSearchHeading(count: number) {
  if (count === 1) return "1 saved search";
  return `${count} saved searches`;
}
