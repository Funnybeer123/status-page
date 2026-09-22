import { Role } from "@prisma/client";

export function isResearcherPurpose(purpose?: string | null) {
  return purpose === "researcher";
}

export function researcherRole(purpose?: string | null, role?: Role) {
  return isResearcherPurpose(purpose) ? Role.viewer : role ?? Role.contributor;
}

export function parseExpiresOn(value?: string | null, fallbackDays = 14) {
  const raw = value?.trim();
  if (raw) {
    const day = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (day) {
      return new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 23, 59, 59, 999));
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000);
}

export function researcherInviteHeading(count: number) {
  if (!count) return "No guest-researcher invites yet";
  if (count === 1) return "1 guest-researcher invite";
  return `${count} guest-researcher invites`;
}

export function researcherInviteLine(email: string | null | undefined, expiresAt: Date | string) {
  const who = email?.trim() || "A guest researcher";
  const when = expiresAt instanceof Date ? expiresAt.toISOString().slice(0, 10) : String(expiresAt).slice(0, 10);
  return `${who} · expires ${when}`;
}

export function inviteExpired(expiresAt: Date | string, now = new Date()) {
  return new Date(expiresAt).getTime() < now.getTime();
}
