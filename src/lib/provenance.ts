export function provenanceHeading(title: string, count: number) {
  const item = title.trim() || "this heirloom";
  if (!count) return `Who held ${item} is not recorded yet`;
  if (count === 1) return `1 person held ${item}`;
  return `${count} people held ${item}`;
}

export function holdLine(name: string, from?: string | null, until?: string | null) {
  const who = name.trim() || "Someone in the family";
  if (from && until) return `${who} · ${from} – ${until}`;
  if (from) return `${who} · from ${from}`;
  if (until) return `${who} · until ${until}`;
  return who;
}

export function sortHolds<T extends { heldFrom?: Date | string | null; createdAt?: Date | string | null }>(holds: T[]) {
  return [...holds].sort((a, b) => {
    const aTime = a.heldFrom ? new Date(a.heldFrom).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.heldFrom ? new Date(b.heldFrom).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aCreated - bCreated;
  });
}

export function currentHolder<T extends { heldUntil?: Date | string | null }>(holds: T[]) {
  return [...holds].reverse().find((hold) => !hold.heldUntil) ?? holds.at(-1) ?? null;
}
