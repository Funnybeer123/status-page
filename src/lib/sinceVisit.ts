export function sinceVisitHeading(count: number, firstVisit = false) {
  if (firstVisit && !count) return "Welcome back — nothing new yet";
  if (firstVisit) return count === 1 ? "1 thing since you last visited" : `${count} things since you last visited`;
  if (!count) return "Nothing has changed since your last visit";
  if (count === 1) return "1 thing changed since your last visit";
  return `${count} things changed since your last visit`;
}

export function sinceVisitLine(title: string, actor?: string | null) {
  const who = actor?.trim();
  return who ? `${who} · ${title.trim()}` : title.trim() || "Something was added";
}
