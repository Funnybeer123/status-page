export function parseDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function splitIds(value?: string | null) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
