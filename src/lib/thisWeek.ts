const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function thisWeekSince(now = new Date()) {
  return new Date(now.getTime() - WEEK_MS);
}

export function inThisWeek(createdAt?: Date | string | null, now = new Date()) {
  if (!createdAt) return false;
  const when = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(when.getTime())) return false;
  return when.getTime() >= thisWeekSince(now).getTime() && when.getTime() <= now.getTime();
}

export type WeekActivity = {
  id: string;
  title: string;
  verb: string;
  actorName?: string | null;
  createdAt: Date | string;
  href?: string;
};

export function compileThisWeek(activities: WeekActivity[], now = new Date()) {
  return activities
    .filter((item) => inThisWeek(item.createdAt, now))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function thisWeekHeading(count: number) {
  if (!count) return "Nothing new this week";
  if (count === 1) return "What a relative added this week";
  return `What relatives added this week · ${count}`;
}
