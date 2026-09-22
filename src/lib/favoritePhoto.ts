export function favoritePhotoHeading(name?: string | null) {
  const who = name?.trim() || "This relative";
  return `Favorite photograph · ${who}`;
}

export function favoritesHeading(count: number) {
  if (!count) return "No favorite photographs yet";
  if (count === 1) return "1 favorite photograph";
  return `${count} favorite photographs`;
}

export function missingFavoriteHeading(count: number) {
  if (!count) return "Everyone with a photograph has a favorite";
  if (count === 1) return "1 person still needs a favorite photograph";
  return `${count} people still need a favorite photograph`;
}

export function favoriteStarLabel(on: boolean) {
  return on ? "Favorite photograph" : "Mark as favorite";
}
