export type PlacedTag = {
  id: string;
  personId: string;
  name: string;
  x?: number | null;
  y?: number | null;
};

export function placedOnPhoto(tags: PlacedTag[]) {
  return tags.filter((tag) => tag.x != null && tag.y != null);
}

export function unlocatedTags(tags: PlacedTag[]) {
  return tags.filter((tag) => tag.x == null || tag.y == null);
}

export function clampPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.min(100, Math.max(0, value));
}
