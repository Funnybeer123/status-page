export function pewLine(church?: string | null, pewNumber?: string | null, person?: string | null) {
  const house = church?.trim() || "Church";
  const pew = pewNumber?.trim() || "pew";
  const who = person?.trim();
  return who ? `${house} · pew ${pew} · ${who}` : `${house} · pew ${pew}`;
}

export function pewsHeading(count: number) {
  if (!count) return "No rented pews yet";
  if (count === 1) return "1 rented church pew";
  return `${count} rented church pews`;
}

export function missingPewsHeading(count: number) {
  return count ? "No rented pew has been recorded" : "A rented pew is already recorded";
}

export function compilePews<T extends { church: string; pewNumber: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.church.localeCompare(b.church) || a.pewNumber.localeCompare(b.pewNumber));
}
