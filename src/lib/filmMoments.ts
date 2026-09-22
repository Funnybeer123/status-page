export type FilmCue = {
  id: string;
  seconds: number;
  title: string;
  notes?: string | null;
};

export function formatTimecode(seconds?: number | null) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function parseTimecode(value?: string | number | null) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Math.max(0, Number(text));
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return Math.max(0, parts[0]! * 60 + parts[1]!);
  if (parts.length === 3) return Math.max(0, parts[0]! * 3600 + parts[1]! * 60 + parts[2]!);
  return null;
}

export function sortFilmMoments(moments: FilmCue[]) {
  return [...moments].sort((a, b) => a.seconds - b.seconds || a.title.localeCompare(b.title));
}

export function filmMomentLine(moment: FilmCue) {
  return `${formatTimecode(moment.seconds)} · ${moment.title}`;
}
