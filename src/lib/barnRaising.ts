function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type BarnJob = {
  id: string;
  person: string;
  personId: string;
  job: string;
};

export function barnJobLine(person?: string | null, job?: string | null) {
  const who = person?.trim() || "A neighbor";
  const part = job?.trim() || "a job";
  return `${who} · ${part}`;
}

export function barnRaisingHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This barn raising";
  if (!count) return `${name} · no crew yet`;
  if (count === 1) return `${name} · 1 person`;
  return `${name} · ${count} people`;
}

export function barnRaisingsHeading(count: number) {
  if (!count) return "No barn raisings yet";
  if (count === 1) return "1 barn raising";
  return `${count} barn raisings`;
}

export function missingBarnsHeading(count: number) {
  if (!count) return "Every barn raising already has a crew";
  if (count === 1) return "1 barn raising still needs a crew";
  return `${count} barn raisings still need a crew`;
}

export function compileBarnCrew(rows: BarnJob[]) {
  return [...rows].sort((a, b) => a.job.localeCompare(b.job) || a.person.localeCompare(b.person));
}

export function compileBarns<T extends { heldOn?: Date | string | null; title: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.title.localeCompare(b.title),
  );
}
