export function hasBorrowedCredit(row?: { borrowedFromAlbumId?: string | null } | null) {
  return Boolean(row?.borrowedFromAlbumId);
}

export function borrowedFromLine(albumTitle?: string | null) {
  const title = albumTitle?.trim() || "another relative’s album";
  return `Borrowed from ${title}`;
}

export function borrowedIndexHeading(count: number) {
  if (!count) return "No photographs borrowed from another album";
  if (count === 1) return "1 photograph borrowed from another album";
  return `${count} photographs borrowed from another album`;
}

export function uncreditedHeading(count: number) {
  if (!count) return "Every borrowed photograph names the album";
  if (count === 1) return "1 photograph still needs a borrowed-from credit";
  return `${count} photographs still need a borrowed-from credit`;
}
