export function readAloudHeading(title: string) {
  return `Read aloud: ${title.trim() || "this letter"}`;
}

export function aloudParagraphs(transcript: string) {
  return transcript
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function lettersReadyHeading(count: number) {
  if (!count) return "No letters ready to read aloud";
  if (count === 1) return "1 letter ready to read aloud";
  return `${count} letters ready to read aloud`;
}
