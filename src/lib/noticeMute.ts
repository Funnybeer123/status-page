export const NOTICE_CATEGORIES = ["birthday", "upload", "story", "letter", "follow", "activity"] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export function isNoticeCategory(value: string): value is NoticeCategory {
  return (NOTICE_CATEGORIES as readonly string[]).includes(value);
}

export function noticeCategoryLabel(category: string) {
  if (category === "birthday") return "Birthdays";
  if (category === "upload") return "New uploads";
  if (category === "story") return "Stories";
  if (category === "letter") return "Letters";
  if (category === "follow") return "Follow notices";
  return "Other activity";
}

export function mutedCategoriesHeading(count: number) {
  if (!count) return "No notice categories muted";
  if (count === 1) return "1 notice category muted";
  return `${count} notice categories muted`;
}

export function muteCategoryLine(category: string, muted: boolean) {
  const label = noticeCategoryLabel(category);
  return muted ? `${label} · muted` : `${label} · you will get notices`;
}

export function activityCategory(entityType: string): NoticeCategory {
  if (entityType === "asset" || entityType === "photo" || entityType === "restore" || entityType === "pair" || entityType === "film" || entityType === "moment") {
    return "upload";
  }
  if (entityType === "story") return "story";
  if (
    entityType === "letter" ||
    entityType === "document" ||
    entityType === "clipping" ||
    entityType === "obituary" ||
    entityType === "will" ||
    entityType === "recipe"
  ) {
    return "letter";
  }
  return "activity";
}

export function noticeCategoryFrom(title: string, href?: string | null): NoticeCategory {
  const text = `${title} ${href || ""}`.toLowerCase();
  if (/birthday/.test(text)) return "birthday";
  if (/a (story|photograph|letter) was added about/.test(text)) return "follow";
  if ((href || "").startsWith("/archive") || /uploaded|photograph|restoration/.test(text)) return "upload";
  if ((href || "").startsWith("/stories") || /\bwrote\b/.test(text)) return "story";
  if ((href || "").startsWith("/letters") || /letter|clipping|obituary/.test(text)) return "letter";
  return "activity";
}

export function filterMutedNotifications<T extends { title: string; href?: string | null }>(
  items: T[],
  muted: Iterable<string>,
) {
  const skip = new Set(muted);
  if (!skip.size) return items;
  return items.filter((item) => !skip.has(noticeCategoryFrom(item.title, item.href)));
}

export function filterBirthdayReminders<T extends { kind?: string; title?: string }>(items: T[], muted: Iterable<string>) {
  const skip = new Set(muted);
  if (!skip.has("birthday")) return items;
  return items.filter((item) => item.kind !== "birthday" && !/birthday/i.test(item.title || ""));
}

export function followKindCategory(kind: "story" | "photo" | "letter"): NoticeCategory {
  if (kind === "photo") return "upload";
  return kind;
}

export async function loadMutedCategories(familyId: string, userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.noticeMute.findMany({
    where: { familyId, userId },
    select: { category: true },
  });
  return rows.map((row) => row.category);
}
