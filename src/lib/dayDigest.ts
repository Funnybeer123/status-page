import { isoDateOnly, todayIso } from "@/lib/secretUntil";

export type DigestItem = {
  id: string;
  title: string;
  kind: string;
  href: string;
  detail?: string | null;
};

export function digestHeading(count: number) {
  if (!count) return "Nothing due at the start of the day";
  if (count === 1) return "Start of the day · 1 thing due today";
  return `Start of the day · ${count} things due today`;
}

export function emptyDigestHeading() {
  return "Nothing due at the start of the day";
}

export function digestSubject(familyName?: string | null, count = 0) {
  const name = familyName?.trim() || "the family";
  if (!count) return `${name}: a quiet morning`;
  if (count === 1) return `${name}: 1 thing due today`;
  return `${name}: ${count} things due today`;
}

export function compileDayDigest(input: {
  reminders?: Array<{ id: string; title: string; daysUntil: number; personId?: string; monthDay?: string }>;
  reunions?: Array<{ id: string; title: string; happenedOn?: Date | string | null }>;
  secrets?: Array<{ id: string; title: string; secretUntil?: Date | string | null; href: string }>;
  from?: Date;
}) {
  const from = input.from || new Date();
  const today = todayIso(from);
  const items: DigestItem[] = [];
  for (const reminder of input.reminders || []) {
    if (reminder.daysUntil !== 0) continue;
    items.push({
      id: reminder.id,
      title: reminder.title,
      kind: "reminder",
      href: reminder.personId ? `/people/${reminder.personId}` : "/digest",
      detail: reminder.monthDay || null,
    });
  }
  for (const reunion of input.reunions || []) {
    if (isoDateOnly(reunion.happenedOn) !== today) continue;
    items.push({
      id: reunion.id,
      title: reunion.title,
      kind: "reunion",
      href: `/reunions/${reunion.id}`,
      detail: "Reunion today",
    });
  }
  for (const secret of input.secrets || []) {
    if (isoDateOnly(secret.secretUntil) !== today) continue;
    items.push({
      id: secret.id,
      title: secret.title,
      kind: "secret",
      href: secret.href,
      detail: "Unlocks today",
    });
  }
  return items;
}

export function movedAwayHeading(count: number) {
  if (!count) return "No one has a closed residence yet";
  if (count === 1) return "1 person moved away";
  return `${count} people moved away`;
}

export function movedAwayLine(name: string, place: string, endedAt?: string | null) {
  const who = name.trim() || "Someone";
  const where = place.trim() || "home";
  return endedAt ? `${who} left ${where} in ${endedAt}` : `${who} left ${where}`;
}
