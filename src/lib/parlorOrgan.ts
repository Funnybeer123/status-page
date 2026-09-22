export type OrganRow = {
  id: string;
  person: string;
  title: string;
  place?: string | null;
};

export function parlorOrganLine(person?: string | null, title?: string | null, place?: string | null) {
  const who = person?.trim() || "A player";
  const instrument = title?.trim() || "the parlor organ";
  const where = place?.trim();
  return where ? `${who} played ${instrument} · ${where}` : `${who} played ${instrument}`;
}

export function parlorOrgansHeading(count: number) {
  if (!count) return "No parlor organs yet";
  if (count === 1) return "1 parlor organ";
  return `${count} parlor organs`;
}

export function missingOrgansHeading(count: number) {
  return count ? "No parlor organ has been written down" : "A parlor organ is already written down";
}

export function compileOrgans(rows: OrganRow[]) {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title) || a.person.localeCompare(b.person));
}
