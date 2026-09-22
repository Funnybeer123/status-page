export type ShiftRow = {
  id: string;
  personName: string;
  label: string;
  startsAt?: string | null;
  notes?: string | null;
};

export function shiftSortKey(startsAt?: string | null) {
  const value = startsAt?.trim().toLowerCase();
  if (!value) return "9999";
  if (value === "morning") return "09:00";
  if (value === "afternoon") return "13:00";
  if (value === "evening") return "17:00";
  return value;
}

export function shiftLine(person?: string | null, label?: string | null, startsAt?: string | null) {
  const who = person?.trim() || "A volunteer";
  const when = label?.trim() || startsAt?.trim() || "a shift";
  const time = startsAt?.trim() && startsAt.trim() !== when ? ` · ${startsAt.trim()}` : "";
  return `${who} · ${when}${time}`;
}

export function shiftsHeading(reunion?: string | null, count = 0) {
  const name = reunion?.trim() || "This reunion";
  if (!count) return `Digitizing shifts · ${name}`;
  if (count === 1) return `Digitizing shifts · ${name} · 1 volunteer`;
  return `Digitizing shifts · ${name} · ${count} volunteers`;
}

export function missingShiftsHeading(count: number) {
  if (!count) return "Every reunion has a digitizing shift";
  if (count === 1) return "1 reunion still needs a digitizing shift";
  return `${count} reunions still need a digitizing shift`;
}

export function shiftRosterHeading(reunion?: string | null) {
  const name = reunion?.trim() || "This reunion";
  return `Digitizing roster · ${name}`;
}

export function compileReunionShifts(rows: ShiftRow[]) {
  return [...rows].sort(
    (a, b) =>
      shiftSortKey(a.startsAt).localeCompare(shiftSortKey(b.startsAt)) ||
      a.personName.localeCompare(b.personName) ||
      a.label.localeCompare(b.label),
  );
}
