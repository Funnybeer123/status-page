export function uploadersHeading(count: number) {
  if (!count) return "No one has uploaded to the archive yet";
  if (count === 1) return "1 relative has uploaded to the archive";
  return `${count} relatives have uploaded to the archive`;
}

export function uploaderGroupHeading(name: string, count: number) {
  const who = name.trim() || "Someone";
  if (count === 1) return `${who} · 1 upload`;
  return `${who} · ${count} uploads`;
}

export function groupByUploader<T extends { uploadedBy?: { name?: string | null } | null; uploadedByName?: string | null }>(
  assets: T[],
) {
  const groups = new Map<string, T[]>();
  for (const asset of assets) {
    const name = asset.uploadedBy?.name?.trim() || asset.uploadedByName?.trim() || "Unknown relative";
    const list = groups.get(name) ?? [];
    list.push(asset);
    groups.set(name, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, items]) => ({ name, items, heading: uploaderGroupHeading(name, items.length) }));
}
