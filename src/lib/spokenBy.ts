export function spokenByLine(speaker?: string | null, uploader?: string | null) {
  const who = speaker?.trim();
  const from = uploader?.trim();
  if (who && from && who !== from) return `Spoken by ${who} · uploaded by ${from}`;
  if (who) return `Spoken by ${who}`;
  return "Speaker unknown";
}

export function hasSpokenBy(asset?: { spokenById?: string | null } | null) {
  return Boolean(asset?.spokenById);
}

export function uncreditedOralHeading(count: number) {
  if (!count) return "Every oral history names who spoke";
  if (count === 1) return "1 oral history still needs a spoken-by credit";
  return `${count} oral histories still need a spoken-by credit`;
}

export function oralCreditsHeading(count: number) {
  if (!count) return "No spoken-by credits yet";
  if (count === 1) return "1 oral history names who spoke";
  return `${count} oral histories name who spoke`;
}

export function compileOralCredits<
  T extends {
    id: string;
    title?: string | null;
    spokenBy?: { displayName?: string | null } | null;
    uploadedBy?: { name?: string | null } | null;
  },
>(items: T[]) {
  return items
    .map((item) => ({
      id: item.id,
      title: item.title || "A recording",
      href: `/archive/${item.id}`,
      line: spokenByLine(item.spokenBy?.displayName, item.uploadedBy?.name),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
