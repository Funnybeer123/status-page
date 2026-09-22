export type TeacherRow = {
  id: string;
  teacher: string;
  school: string;
  year: number;
};

export function teacherLine(teacher?: string | null, school?: string | null, year?: number | null) {
  const who = teacher?.trim() || "A teacher";
  const where = school?.trim() || "school";
  const when = year != null ? String(year) : "year unknown";
  return `${who} taught ${where} · ${when}`;
}

export function teachersHeading(count: number) {
  if (!count) return "No schoolteachers yet";
  if (count === 1) return "1 schoolteacher";
  return `${count} schoolteachers`;
}

export function missingTeachersHeading(count: number) {
  if (!count) return "Every class already names the teacher";
  if (count === 1) return "1 class still needs a teacher";
  return `${count} classes still need a teacher`;
}

export function compileTeachers(rows: TeacherRow[]) {
  return [...rows].sort((a, b) => a.year - b.year || a.school.localeCompare(b.school) || a.teacher.localeCompare(b.teacher));
}
