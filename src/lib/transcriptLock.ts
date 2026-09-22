export function isTranscriptLocked(document?: { transcriptLockedAt?: Date | string | null } | null) {
  return Boolean(document?.transcriptLockedAt);
}

export function transcriptCreditLine(name?: string | null) {
  return name?.trim() ? `Transcribed by ${name.trim()}` : "No transcription credit yet";
}

export function transcriptLockHeading(locked: boolean) {
  return locked ? "This transcript is finished and locked" : "This transcript can still be edited";
}

export function lockedLettersHeading(count: number) {
  if (!count) return "No finished transcripts yet";
  if (count === 1) return "1 letter transcript is finished";
  return `${count} letter transcripts are finished`;
}

export function transcriptCreditsHeading(count: number) {
  if (!count) return "No transcription credits yet";
  if (count === 1) return "1 letter has a transcription credit";
  return `${count} letters have a transcription credit`;
}

export function lockConflictMessage() {
  return "This transcript is locked. Unlock it before changing the words.";
}
