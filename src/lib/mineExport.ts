export function mineExportHeading(count: number) {
  if (!count) return "You have not added anything yet";
  if (count === 1) return "1 thing you added";
  return `${count} things you added`;
}

export function mineExportFilename(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "relative";
  return `${slug}-added.zip`;
}

export function mineManifestLine(kind: string, title: string) {
  return `${kind}: ${title.trim() || "untitled"}`;
}
