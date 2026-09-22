function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type InsurancePay = {
  id: string;
  person: string;
  personId: string;
  paid: string;
};

export function insuranceMemberLine(person?: string | null, paid?: string | null) {
  const who = person?.trim() || "A member";
  const amount = paid?.trim() || "an assessment";
  return `${who} paid ${amount}`;
}

export function insuranceHeading(company?: string | null, loss?: string | null, count = 0) {
  const name = company?.trim() || "The company";
  const what = loss?.trim() || "a loss";
  if (!count) return `${name} · ${what} · no members yet`;
  if (count === 1) return `${name} · ${what} · 1 member`;
  return `${name} · ${what} · ${count} members`;
}

export function assessmentsHeading(count: number) {
  if (!count) return "No mutual-insurance assessments yet";
  if (count === 1) return "1 mutual-insurance assessment";
  return `${count} mutual-insurance assessments`;
}

export function missingAssessmentsHeading(count: number) {
  if (!count) return "Every assessment already has a member roll";
  if (count === 1) return "1 assessment still needs a member roll";
  return `${count} assessments still need a member roll`;
}

export function compileInsuranceMembers(rows: InsurancePay[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person));
}

export function compileAssessments<T extends { assessedOn?: Date | string | null; company: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.assessedOn).localeCompare(isoKey(b.assessedOn)) || a.company.localeCompare(b.company),
  );
}
