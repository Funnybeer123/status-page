export function placePinLine(title: string, placeName: string) {
  return `${title.trim() || "A letter or story"} pinned at ${placeName.trim() || "this place"}`;
}

export function placePinsHeading(count: number) {
  if (!count) return "No letters or stories pinned on the map";
  if (count === 1) return "1 letter or story pinned on the map";
  return `${count} letters or stories pinned on the map`;
}

export function unpinnedLettersHeading(count: number) {
  if (!count) return "Every letter is pinned to a place";
  if (count === 1) return "1 letter is not pinned to a place";
  return `${count} letters are not pinned to a place`;
}

export function pinHref(pin: { documentId?: string | null; storyId?: string | null }) {
  if (pin.storyId) return `/stories/${pin.storyId}`;
  if (pin.documentId) return `/letters/${pin.documentId}`;
  return "/map/pins";
}
