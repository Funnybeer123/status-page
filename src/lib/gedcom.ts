export type GedcomPerson = {
  xref: string;
  givenName: string;
  familyName: string;
  displayName: string;
  sex: string | null;
  birthDate: string | null;
  deathDate: string | null;
  notes: string | null;
};

export type GedcomFamily = {
  xref: string;
  husband: string | null;
  wife: string | null;
  children: string[];
  marriedOn: string | null;
};

export type GedcomTree = {
  people: GedcomPerson[];
  families: GedcomFamily[];
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function toGedcomDate(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function fromGedcomDate(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^(?:(\d{1,2}) )?([A-Z]{3}) (\d{4})$/i);
  if (!match) {
    const year = value.trim().match(/^(\d{4})$/);
    return year ? `${year[1]}-01-01` : null;
  }
  const day = String(Number(match[1] || "1")).padStart(2, "0");
  const month = String(MONTHS.indexOf(match[2].toUpperCase()) + 1).padStart(2, "0");
  if (month === "00") return null;
  return `${match[3]}-${month}-${day}`;
}

function parseName(raw: string) {
  const match = raw.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (!match) {
    const displayName = raw.trim();
    const parts = displayName.split(/\s+/);
    return { givenName: parts.slice(0, -1).join(" ") || displayName, familyName: parts.at(-1) || "", displayName };
  }
  const givenName = `${match[1]} ${match[3]}`.replace(/\s+/g, " ").trim();
  const familyName = match[2].trim();
  const displayName = [givenName, familyName].filter(Boolean).join(" ");
  return { givenName, familyName, displayName };
}

export function parseGedcom(text: string): GedcomTree {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const people = new Map<string, GedcomPerson>();
  const families = new Map<string, GedcomFamily>();
  let currentPerson: GedcomPerson | null = null;
  let currentFamily: GedcomFamily | null = null;
  let event: "BIRT" | "DEAT" | "MARR" | null = null;

  for (const raw of lines) {
    const match = raw.match(/^(\d+)\s+(?:@([^@]+)@\s+)?(\S+)(?:\s+(.*))?$/);
    if (!match) continue;
    const level = Number(match[1]);
    const xref = match[2] || null;
    const tag = match[3];
    const value = (match[4] || "").trim();

    if (level === 0) {
      currentPerson = null;
      currentFamily = null;
      event = null;
      if (tag === "INDI" && xref) {
        currentPerson = {
          xref,
          givenName: "",
          familyName: "",
          displayName: xref,
          sex: null,
          birthDate: null,
          deathDate: null,
          notes: null,
        };
        people.set(xref, currentPerson);
      } else if (tag === "FAM" && xref) {
        currentFamily = { xref, husband: null, wife: null, children: [], marriedOn: null };
        families.set(xref, currentFamily);
      }
      continue;
    }

    if (currentPerson) {
      if (level === 1) event = tag === "BIRT" || tag === "DEAT" ? tag : null;
      if (tag === "NAME") {
        const parsed = parseName(value);
        currentPerson.givenName = parsed.givenName;
        currentPerson.familyName = parsed.familyName;
        currentPerson.displayName = parsed.displayName || currentPerson.displayName;
      }
      if (tag === "SEX") currentPerson.sex = value.slice(0, 1).toUpperCase();
      if (tag === "DATE" && event === "BIRT") currentPerson.birthDate = fromGedcomDate(value);
      if (tag === "DATE" && event === "DEAT") currentPerson.deathDate = fromGedcomDate(value);
      if (tag === "NOTE") currentPerson.notes = [currentPerson.notes, value].filter(Boolean).join("\n");
    }

    if (currentFamily) {
      if (level === 1) event = tag === "MARR" ? "MARR" : event === "MARR" && level === 1 ? null : event;
      if (tag === "HUSB") currentFamily.husband = value.replace(/@/g, "") || xref;
      if (tag === "WIFE") currentFamily.wife = value.replace(/@/g, "") || xref;
      if (tag === "CHIL") currentFamily.children.push(value.replace(/@/g, ""));
      if (tag === "DATE" && event === "MARR") currentFamily.marriedOn = fromGedcomDate(value);
    }
  }

  return { people: [...people.values()], families: [...families.values()] };
}

export function exportGedcom(input: {
  familyName: string;
  people: {
    id: string;
    displayName: string;
    givenName?: string | null;
    familyName?: string | null;
    sex?: string | null;
    birthDate?: Date | string | null;
    deathDate?: Date | string | null;
    notes?: string | null;
  }[];
  relationships: { type: string; fromPersonId: string; toPersonId: string; startedAt?: Date | string | null }[];
}) {
  const xref = new Map(input.people.map((person, index) => [person.id, `I${index + 1}`]));
  const lines = [
    "0 HEAD",
    "1 SOUR FamilyLineage",
    "1 GEDC",
    "2 VERS 5.5.1",
    "1 CHAR UTF-8",
    `1 NOTE ${input.familyName}`,
  ];

  for (const person of input.people) {
    const id = xref.get(person.id)!;
    const familyName = person.familyName || person.displayName.split(" ").slice(-1)[0] || "";
    const givenName = person.givenName || person.displayName.replace(familyName, "").trim() || person.displayName;
    lines.push(`0 @${id}@ INDI`);
    lines.push(`1 NAME ${givenName} /${familyName}/`);
    if (person.sex) lines.push(`1 SEX ${person.sex.slice(0, 1).toUpperCase()}`);
    const birth = toGedcomDate(person.birthDate);
    if (birth) {
      lines.push("1 BIRT");
      lines.push(`2 DATE ${birth}`);
    }
    const death = toGedcomDate(person.deathDate);
    if (death) {
      lines.push("1 DEAT");
      lines.push(`2 DATE ${death}`);
    }
    if (person.notes) lines.push(`1 NOTE ${person.notes.replace(/\n/g, " ")}`);
  }

  const partners = input.relationships.filter((rel) => rel.type === "partner");
  const parents = input.relationships.filter((rel) => rel.type === "parent" || rel.type === "adoptive" || rel.type === "step");
  let familyIndex = 1;
  const used = new Set<string>();
  for (const rel of partners) {
    const key = [rel.fromPersonId, rel.toPersonId].sort().join(":");
    if (used.has(key)) continue;
    used.add(key);
    const husb = xref.get(rel.fromPersonId);
    const wife = xref.get(rel.toPersonId);
    if (!husb || !wife) continue;
    const fam = `F${familyIndex}`;
    familyIndex += 1;
    lines.push(`0 @${fam}@ FAM`);
    lines.push(`1 HUSB @${husb}@`);
    lines.push(`1 WIFE @${wife}@`);
    const married = toGedcomDate(rel.startedAt);
    if (married) {
      lines.push("1 MARR");
      lines.push(`2 DATE ${married}`);
    }
    for (const childRel of parents) {
      if (childRel.fromPersonId !== rel.fromPersonId && childRel.fromPersonId !== rel.toPersonId) continue;
      const child = xref.get(childRel.toPersonId);
      if (child) lines.push(`1 CHIL @${child}@`);
    }
  }

  const parented = new Set(parents.map((rel) => rel.toPersonId));
  for (const childId of parented) {
    const childParents = parents.filter((rel) => rel.toPersonId === childId);
    const already = partners.some((rel) => {
      const ids = [rel.fromPersonId, rel.toPersonId];
      return childParents.every((parent) => ids.includes(parent.fromPersonId));
    });
    if (already) continue;
    const fam = `F${familyIndex}`;
    familyIndex += 1;
    lines.push(`0 @${fam}@ FAM`);
    childParents.forEach((parent, index) => {
      const id = xref.get(parent.fromPersonId);
      if (!id) return;
      lines.push(`1 ${index === 0 ? "HUSB" : "WIFE"} @${id}@`);
    });
    const child = xref.get(childId);
    if (child) lines.push(`1 CHIL @${child}@`);
  }

  lines.push("0 TRLR");
  return `${lines.join("\n")}\n`;
}
