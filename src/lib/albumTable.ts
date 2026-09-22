import { watermarkLabel } from "@/lib/watermark";

export function albumTableHeading(title?: string | null) {
  return `Reunion table sheet · ${title?.trim() || "this album"}`;
}

export function albumTableHint() {
  return "Print this watermarked sheet for the reunion table.";
}

export function emptyAlbumTableHeading() {
  return "This album has no photographs for a table sheet.";
}

export function albumTableMark(familyName?: string | null) {
  return watermarkLabel(familyName?.trim() || "Family");
}

export function emptyTableAlbumsHeading(count: number) {
  if (!count) return "Every album has photographs for a table sheet";
  if (count === 1) return "1 album still needs photographs for a table sheet";
  return `${count} albums still need photographs for a table sheet`;
}
