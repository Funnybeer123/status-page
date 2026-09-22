export function filmstripHeading(name: string, count: number) {
  const who = name.trim() || "this person";
  if (!count) return `No photographs of ${who} yet`;
  if (count === 1) return `1 photograph of ${who}`;
  return `${count} photographs of ${who}`;
}

export function familyFilmstripHeading(count: number) {
  if (!count) return "No photographs in the family filmstrip yet";
  if (count === 1) return "1 photograph in the family filmstrip";
  return `${count} photographs in the family filmstrip`;
}

export function emptyFilmstripsHeading(count: number) {
  if (!count) return "Everyone has a photograph";
  if (count === 1) return "1 person still needs a photograph";
  return `${count} people still need a photograph`;
}

function dateKey(value?: Date | string | null, fallback?: string | null) {
  const extra = fallback || "";
  if (!value) return `9999-${extra}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function sortFilmstrip<T extends { capturedAt?: Date | string | null; title?: string | null }>(photos: T[]) {
  return [...photos].sort((a, b) => {
    const byDate = dateKey(a.capturedAt, a.title).localeCompare(dateKey(b.capturedAt, b.title));
    if (byDate) return byDate;
    return (a.title || "").localeCompare(b.title || "");
  });
}

export function isPhotoAsset(asset: { kind?: string | null; mimeType?: string | null; deletedAt?: Date | string | null }) {
  if (asset.deletedAt) return false;
  if (asset.kind === "photo") return true;
  return Boolean(asset.mimeType?.startsWith("image/"));
}
