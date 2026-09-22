export function hasMemorialPortrait(input?: {
  memorialPersonId?: string | null;
  profileAssetId?: string | null;
  memorialPerson?: { profileAssetId?: string | null } | null;
} | null) {
  return Boolean(input?.memorialPersonId && (input.profileAssetId || input.memorialPerson?.profileAssetId));
}

export function obituaryPortraitHeading(name: string) {
  return `Memorial portrait · ${name.trim() || "this person"}`;
}

export function obituaryPortraitLine(title: string, name: string) {
  return `${title.trim() || "An obituary"} · ${name.trim() || "memorial portrait"}`;
}

export function missingObituaryPortraitsHeading(count: number) {
  if (!count) return "Every obituary is linked to a memorial portrait";
  if (count === 1) return "1 obituary still needs a memorial portrait";
  return `${count} obituaries still need a memorial portrait`;
}
