export function isShareRevoked(link?: { revokedAt?: Date | string | null } | null) {
  return Boolean(link?.revokedAt);
}

export function shareRevokeHeading(revoked: boolean) {
  return revoked ? "This share link no longer works" : "This share link is still open";
}

export function shareOpensHeading(count: number) {
  if (!count) return "No one has opened this share link yet";
  if (count === 1) return "1 person opened this share link";
  return `${count} openings of this share link`;
}

export function shareOpenLine(input: { name?: string | null; userAgent?: string | null; openedAt?: Date | string | null }) {
  const who = input.name?.trim() || "Someone who was not signed in";
  const agent = input.userAgent?.trim();
  return agent ? `${who} · ${agent}` : who;
}

export function shareLinksHeading(active: number, revoked = 0) {
  if (!active && !revoked) return "No share links yet";
  if (!revoked) return active === 1 ? "1 share link" : `${active} share links`;
  if (!active) return revoked === 1 ? "1 revoked share link" : `${revoked} revoked share links`;
  return `${active} open · ${revoked} revoked`;
}
