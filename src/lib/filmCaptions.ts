import { formatTimecode, parseTimecode } from "@/lib/filmMoments";

export type CaptionCue = {
  id: string;
  seconds: number;
  text: string;
};

export function filmCaptionsHeading(title?: string | null) {
  const name = title?.trim();
  return name ? `Silent captions · ${name}` : "Silent film captions";
}

export function filmCaptionLine(seconds?: number | null, text?: string | null) {
  return `${formatTimecode(seconds)} · ${text?.trim() || "A quiet beat"}`;
}

export function sortFilmCaptions<T extends CaptionCue>(captions: T[]) {
  return [...captions].sort((a, b) => a.seconds - b.seconds || a.text.localeCompare(b.text));
}

export function missingCaptionsHeading(count: number) {
  if (!count) return "Every film has a caption track";
  if (count === 1) return "1 film still needs a caption track";
  return `${count} films still need a caption track`;
}

export { parseTimecode, formatTimecode };
