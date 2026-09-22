export function oralPlaylistHeading(count: number) {
  if (!count) return "No oral histories in the playlist yet";
  if (count === 1) return "1 oral history in the playlist";
  return `${count} oral histories in the playlist`;
}

export function emptyPlaylistHeading() {
  return "The oral-history playlist is empty";
}

export function undatedOralHeading(count: number) {
  if (!count) return "Every oral history has a date";
  if (count === 1) return "1 oral history still needs a date";
  return `${count} oral histories still need a date`;
}

export function missingOralHeading(count: number) {
  if (!count) return "Everyone has an oral history";
  if (count === 1) return "1 person still needs an oral history";
  return `${count} people still need an oral history`;
}

export function isOralHistory(asset: { kind?: string | null; mimeType?: string | null; deletedAt?: Date | string | null }) {
  if (asset.deletedAt) return false;
  if (asset.kind === "audio" || asset.kind === "video") return true;
  return Boolean(asset.mimeType?.startsWith("audio/") || asset.mimeType?.startsWith("video/"));
}

function dateKey(value?: Date | string | null, fallback?: string | null) {
  const extra = fallback || "";
  if (!value) return `~${extra}`;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function sortOralPlaylist<T extends { capturedAt?: Date | string | null; title?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const byDate = dateKey(a.capturedAt, a.title).localeCompare(dateKey(b.capturedAt, b.title));
    if (byDate) return byDate;
    return (a.title || "").localeCompare(b.title || "");
  });
}

export function playlistLine(title?: string | null, when?: string | null) {
  const name = title?.trim() || "A recording";
  return when ? `${name} · ${when}` : name;
}
