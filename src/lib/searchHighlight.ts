export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function searchWords(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function highlightHitCount(text: string, query: string) {
  const words = searchWords(query);
  if (!words.length || !text) return 0;
  const pattern = new RegExp(words.map(escapeRegExp).join("|"), "gi");
  return (text.match(pattern) || []).length;
}

export function highlightSearchWords(text: string, query: string) {
  const escaped = escapeHtml(text || "");
  const words = searchWords(query);
  if (!words.length) return escaped;
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

export function letterSearchHref(id: string, query?: string | null) {
  const q = (query || "").trim();
  return q ? `/letters/${id}?q=${encodeURIComponent(q)}` : `/letters/${id}`;
}

export function highlightHeading(query: string, hits: number) {
  const q = query.trim() || "those words";
  if (!hits) return `No matches for “${q}” in this letter`;
  if (hits === 1) return `1 match for “${q}” in this letter`;
  return `${hits} matches for “${q}” in this letter`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
