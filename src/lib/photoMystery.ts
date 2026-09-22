import { unidentifiedPhotos } from "@/lib/moreFamily";

export function mysteryHeading(count: number) {
  if (!count) return "No unidentified faces in the mystery queue";
  if (count === 1) return "Photo mystery · 1 unidentified face";
  return `Photo mystery · ${count} unidentified faces`;
}

export function emptyMysteryHeading() {
  return "Every face has a name";
}

export function mysteryGuessLine(name?: string | null, guesser?: string | null) {
  const who = name?.trim() || "Someone the family still knows";
  const from = guesser?.trim();
  return from ? `${who} · guessed by ${from}` : who;
}

export function unnamedGuessHeading(count: number) {
  if (!count) return "Every guess names a person";
  if (count === 1) return "1 guess still needs a name";
  return `${count} guesses still need a name`;
}

export function compileMysteryQueue<
  A extends { id: string; title?: string | null; tags?: unknown[]; deletedAt?: Date | string | null; kind?: string },
  G extends { assetId: string; name?: string | null; person?: { displayName?: string | null } | null; user?: { name?: string | null } | null },
>(photos: A[], guesses: G[] = []) {
  const unknown = unidentifiedPhotos(photos);
  return unknown.map((photo) => {
    const rows = guesses.filter((guess) => guess.assetId === photo.id);
    return {
      id: photo.id,
      title: photo.title || "Untitled photograph",
      href: `/archive/${photo.id}`,
      guesses: rows.map((guess) => ({
        name: guess.person?.displayName || guess.name || null,
        guesser: guess.user?.name || null,
        line: mysteryGuessLine(guess.person?.displayName || guess.name, guess.user?.name),
      })),
    };
  });
}
