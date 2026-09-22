export function unitRosterLine(input: {
  unitName: string;
  personName: string;
  rank?: string | null;
  branch?: string | null;
}) {
  const rank = input.rank ? `${input.rank} ` : "";
  const branch = input.branch ? ` · ${input.branch}` : "";
  return `${rank}${input.personName} served in ${input.unitName}${branch}`.replace(/\s+/g, " ").trim();
}

export function unitHeading(name: string, count: number) {
  if (!count) return name;
  if (count === 1) return `${name} · 1 who served`;
  return `${name} · ${count} who served`;
}
