export function scanHeading(kind: "census" | "manifest", title: string) {
  return kind === "census" ? `Census scan · ${title}` : `Ship manifest · ${title}`;
}

export function scanLine(title?: string | null) {
  return title?.trim() || "A scan of the page";
}

export function householdsMissingScan<T extends { assetId?: string | null }>(rows: T[]) {
  return rows.filter((row) => !row.assetId);
}

export function voyagesMissingManifest<T extends { assetId?: string | null }>(rows: T[]) {
  return rows.filter((row) => !row.assetId);
}

export function missingScanHeading(count: number) {
  if (!count) return "Every household has its scan";
  if (count === 1) return "1 household still needs a census scan";
  return `${count} households still need a census scan`;
}

export function missingManifestHeading(count: number) {
  if (!count) return "Every voyage has its manifest";
  if (count === 1) return "1 voyage still needs a ship manifest";
  return `${count} voyages still need a ship manifest`;
}
