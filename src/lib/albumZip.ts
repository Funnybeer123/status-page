import { packetSlug } from "@/lib/personPacket";

export function albumZipName(title?: string | null) {
  return `${packetSlug(title || "album")}-album.zip`;
}

export function albumPhotoName(title?: string | null, storagePath?: string | null, index = 0) {
  const fromTitle = packetSlug(title || "");
  const fromPath = storagePath?.split("/").pop() || "";
  if (fromTitle && fromPath.includes(".")) return `${String(index + 1).padStart(2, "0")}-${fromTitle}.${fromPath.split(".").pop()}`;
  if (fromPath) return `${String(index + 1).padStart(2, "0")}-${fromPath}`;
  return `${String(index + 1).padStart(2, "0")}-photo`;
}

export function albumPhotos<
  T extends {
    asset?: {
      id?: string | null;
      kind?: string | null;
      mimeType?: string | null;
      deletedAt?: Date | string | null;
      title?: string | null;
      storagePath?: string | null;
    } | null;
  },
>(items: T[]) {
  return items
    .map((item) => item.asset)
    .filter((asset): asset is NonNullable<T["asset"]> => {
      if (!asset || asset.deletedAt) return false;
      if (asset.kind === "photo") return true;
      return Boolean(asset.mimeType?.startsWith("image/"));
    });
}

export function emptyAlbumsHeading(count: number) {
  if (!count) return "Every album has photographs";
  if (count === 1) return "1 album still needs a photograph";
  return `${count} albums still need a photograph`;
}

export function albumsReadyHeading(count: number) {
  if (!count) return "No albums are ready to export";
  if (count === 1) return "1 album is ready to export";
  return `${count} albums are ready to export`;
}

export function albumZipEmptyMessage() {
  return "This album has no photographs to export.";
}
