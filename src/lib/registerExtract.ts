export type RegisterLine = {
  id: string;
  kind: string;
  happenedOn?: Date | string | null;
  text: string;
  personId?: string | null;
  personName?: string | null;
  otherPersonId?: string | null;
  otherPersonName?: string | null;
  notes?: string | null;
};

const KIND_ORDER: Record<string, number> = { baptism: 0, marriage: 1, burial: 2 };

export function normalizeRegisterKind(kind?: string | null) {
  const value = (kind || "").trim().toLowerCase();
  if (value === "baptism" || value === "christening") return "baptism";
  if (value === "marriage" || value === "wedding") return "marriage";
  if (value === "burial" || value === "funeral" || value === "death") return "burial";
  return value || "entry";
}

export function compileRegisterLines(lines: RegisterLine[]) {
  return [...lines]
    .map((line) => ({ ...line, kind: normalizeRegisterKind(line.kind) }))
    .sort((a, b) => {
      const left = a.happenedOn ? new Date(a.happenedOn).getTime() : 0;
      const right = b.happenedOn ? new Date(b.happenedOn).getTime() : 0;
      if (left !== right) return left - right;
      return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    });
}

export function registerLineText(line: RegisterLine) {
  const names = [line.personName, line.otherPersonName].filter(Boolean).join(" and ");
  if (names && line.text) return `${line.kind}: ${names} — ${line.text}`;
  if (names) return `${line.kind}: ${names}`;
  return `${line.kind}: ${line.text}`;
}

export function registerHeading(church: string, count = 0) {
  if (!count) return church;
  return count === 1 ? `${church} · 1 line` : `${church} · ${count} lines`;
}
