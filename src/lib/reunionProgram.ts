export type ProgramRow = {
  id: string;
  title: string;
  startsAt?: string | null;
  personName?: string | null;
  notes?: string | null;
};

export function programSortKey(startsAt?: string | null) {
  const value = startsAt?.trim();
  if (!value) return "9999";
  if (value === "morning") return "09:00";
  if (value === "noon" || value === "midday") return "12:00";
  if (value === "afternoon") return "14:00";
  if (value === "evening") return "18:00";
  return value;
}

export function programLine(title?: string | null, personName?: string | null, startsAt?: string | null) {
  const item = title?.trim() || "A program item";
  const who = personName?.trim();
  const when = startsAt?.trim();
  if (who && when) return `${when} · ${item} · ${who}`;
  if (when) return `${when} · ${item}`;
  if (who) return `${item} · ${who}`;
  return item;
}

export function programHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This reunion";
  if (!count) return `No program yet for ${name}`;
  if (count === 1) return `Program · ${name} · 1 item`;
  return `Program · ${name} · ${count} items`;
}

export function programsHeading(count: number) {
  if (!count) return "No reunion programs yet";
  if (count === 1) return "1 reunion program";
  return `${count} reunion programs`;
}

export function missingProgramsHeading(count: number) {
  if (!count) return "Every reunion already has a program";
  if (count === 1) return "1 reunion still needs a program";
  return `${count} reunions still need a program`;
}

export function compileProgram(rows: ProgramRow[]) {
  return [...rows].sort(
    (a, b) => programSortKey(a.startsAt).localeCompare(programSortKey(b.startsAt)) || a.title.localeCompare(b.title),
  );
}
