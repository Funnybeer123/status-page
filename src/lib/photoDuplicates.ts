import { crc32 } from "@/lib/zip";

export function normalizePhotoTitle(title?: string | null) {
  return (title || "")
    .toLowerCase()
    .replace(/\(copy\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function photoDateKey(value?: Date | string | null) {
  if (!value) return "undated";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "undated";
  return date.toISOString().slice(0, 10);
}

export function photoNearKey(title?: string | null, capturedAt?: Date | string | null, mimeType?: string | null) {
  return `${normalizePhotoTitle(title)}|${photoDateKey(capturedAt)}|${(mimeType || "").toLowerCase()}`;
}

export function photoCrc(bytes?: Uint8Array | null) {
  if (!bytes?.length) return null;
  return crc32(bytes).toString(16);
}

export function photoDuplicatesHeading(count: number) {
  if (!count) return "No near-identical photographs";
  if (count === 1) return "1 group of near-identical photographs";
  return `${count} groups of near-identical photographs`;
}

export function emptyPhotoDuplicatesHeading() {
  return "Every photograph looks unique";
}

export function compilePhotoDuplicates<
  T extends {
    id: string;
    title?: string | null;
    capturedAt?: Date | string | null;
    mimeType?: string | null;
    crc?: string | null;
    href?: string;
  },
>(photos: T[]) {
  const crcGroups = new Map<string, T[]>();
  const nearGroups = new Map<string, T[]>();
  for (const photo of photos) {
    if (photo.crc) {
      crcGroups.set(photo.crc, [...(crcGroups.get(photo.crc) ?? []), photo]);
    }
    const near = photoNearKey(photo.title, photo.capturedAt, photo.mimeType);
    if (normalizePhotoTitle(photo.title)) {
      nearGroups.set(near, [...(nearGroups.get(near) ?? []), photo]);
    }
  }
  const used = new Set<string>();
  const groups: { id: string; reason: "identical" | "near"; items: T[] }[] = [];
  for (const [crc, items] of crcGroups) {
    if (items.length < 2) continue;
    items.forEach((item) => used.add(item.id));
    groups.push({ id: `crc-${crc}`, reason: "identical", items });
  }
  for (const [key, items] of nearGroups) {
    const leftover = items.filter((item) => !used.has(item.id));
    if (leftover.length < 2) continue;
    leftover.forEach((item) => used.add(item.id));
    groups.push({ id: `near-${key}`, reason: "near", items: leftover });
  }
  return groups.sort((a, b) => (a.items[0]?.title || "").localeCompare(b.items[0]?.title || ""));
}
