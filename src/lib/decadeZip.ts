import { decadeFolderHeading } from "@/lib/archiveFolders";
import { packetSlug } from "@/lib/personPacket";

export function decadeZipName(decade: number | "undated") {
  const folder = decadeFolderHeading(decade).replace(/\s+/g, "-").toLowerCase();
  return `${packetSlug(folder)}.zip`;
}

export function decadeZipEmptyMessage() {
  return "This decade folder has no photographs to export.";
}

export function decadeZipHeading(decade: number | "undated") {
  return `Download the ${decadeFolderHeading(decade)}`;
}

export function missingDecadeZipHeading(count: number) {
  if (!count) return "Every decade folder has photographs";
  if (count === 1) return "1 decade folder still needs a photograph";
  return `${count} decade folders still need a photograph`;
}

export function decadeZipsReadyHeading(count: number) {
  if (!count) return "No decade folder is ready to download";
  if (count === 1) return "1 decade folder is ready to download";
  return `${count} decade folders are ready to download`;
}
