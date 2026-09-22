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

export function watchersHeading(bookmarks: number, follows: number) {
  const book = bookmarks === 1 ? "1 bookmark" : `${bookmarks} bookmarks`;
  const follow = follows === 1 ? "1 follower" : `${follows} followers`;
  if (!bookmarks && !follows) return "No one is watching this person yet";
  return `${book} · ${follow}`;
}
