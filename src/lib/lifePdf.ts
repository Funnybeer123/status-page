export function lifePdfTitle(name: string) {
  const who = name.trim() || "This person";
  return `${who}’s life`;
}

export function lifePdfFilename(name: string) {
  const slug = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "life";
  return `${slug}-life.pdf`;
}

export function lifePdfHeading(name: string) {
  return lifePdfTitle(name);
}
