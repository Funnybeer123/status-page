export type PallbearerRow = {
  id: string;
  deceased: string;
  bearer: string;
  role: string;
  deceasedId: string;
  personId: string;
};

const roleOrder: Record<string, string> = {
  head: "01",
  lead: "01",
  left: "02",
  right: "03",
  honorary: "08",
};

export function pallbearerSortKey(role?: string | null) {
  const key = role?.trim().toLowerCase() || "";
  return roleOrder[key] || `05-${key || "9999"}`;
}

export function pallbearerLine(bearer?: string | null, role?: string | null, deceased?: string | null) {
  const who = bearer?.trim() || "A pallbearer";
  const part = role?.trim() || "pallbearer";
  const forWhom = deceased?.trim();
  return forWhom ? `${who} · ${part} · ${forWhom}` : `${who} · ${part}`;
}

export function pallbearersHeading(count: number) {
  if (!count) return "No pallbearers yet";
  if (count === 1) return "1 pallbearer";
  return `${count} pallbearers`;
}

export function funeralPallbearersHeading(name?: string | null, count = 0) {
  const who = name?.trim() || "This funeral";
  if (!count) return `No pallbearers for ${who}`;
  if (count === 1) return `Pallbearers · ${who} · 1 person`;
  return `Pallbearers · ${who} · ${count} people`;
}

export function missingPallbearersHeading(count: number) {
  if (!count) return "Every funeral already has a pallbearer";
  if (count === 1) return "1 funeral still needs a pallbearer";
  return `${count} funerals still need a pallbearer`;
}

export function compilePallbearers(rows: PallbearerRow[]) {
  return [...rows].sort(
    (a, b) =>
      a.deceased.localeCompare(b.deceased) ||
      pallbearerSortKey(a.role).localeCompare(pallbearerSortKey(b.role)) ||
      a.bearer.localeCompare(b.bearer),
  );
}
