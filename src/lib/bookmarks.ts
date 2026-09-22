export function bookmarkHeading(count: number) {
  if (!count) return "No bookmarked people yet";
  if (count === 1) return "1 bookmarked person";
  return `${count} bookmarked people`;
}

export function bookmarkLine(name: string) {
  return name.trim() || "A relative";
}

export function bookmarkHomeHeading(count: number) {
  if (!count) return "People you bookmarked";
  if (count === 1) return "1 person on your bookmark list";
  return `${count} people on your bookmark list`;
}
