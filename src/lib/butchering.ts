function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type ButcherJob = {
  id: string;
  person: string;
  personId: string;
  job: string;
};

export function butcherJobLine(person?: string | null, job?: string | null) {
  const who = person?.trim() || "A neighbor";
  const part = job?.trim() || "a job";
  return `${who} · ${part}`;
}

export function butcheringHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This hog day";
  if (!count) return `${name} · no crew yet`;
  if (count === 1) return `${name} · 1 person`;
  return `${name} · ${count} people`;
}

export function butcheringsHeading(count: number) {
  if (!count) return "No hog-butchering crews yet";
  if (count === 1) return "1 hog-butchering crew";
  return `${count} hog-butchering crews`;
}

export function missingButcheringHeading(count: number) {
  if (!count) return "Every hog-butchering crew already has a roll";
  if (count === 1) return "1 hog-butchering crew still needs a roll";
  return `${count} hog-butchering crews still need a roll`;
}

export function compileButcheringCrew(rows: ButcherJob[]) {
  return [...rows].sort((a, b) => a.job.localeCompare(b.job) || a.person.localeCompare(b.person));
}

export function compileButchering<T extends { heldOn?: Date | string | null; title: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.title.localeCompare(b.title),
  );
}
