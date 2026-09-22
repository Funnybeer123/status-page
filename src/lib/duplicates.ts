export type DuplicatePerson = {
  id: string;
  displayName: string;
  givenName?: string | null;
  familyName?: string | null;
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
};

export type DuplicatePair = {
  keepId: string;
  dropId: string;
  keepName: string;
  dropName: string;
  score: number;
  reasons: string[];
};

function tokens(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lastName(person: DuplicatePerson) {
  if (person.familyName?.trim()) return person.familyName.trim().toLowerCase();
  return tokens(person.displayName).at(-1) || "";
}

function firstName(person: DuplicatePerson) {
  if (person.givenName?.trim()) return person.givenName.trim().toLowerCase();
  return tokens(person.displayName)[0] || "";
}

function yearOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear();
}

function monthDayOf(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

function compact(value: string) {
  return tokens(value).join("");
}

export function scoreDuplicate(a: DuplicatePerson, b: DuplicatePerson) {
  const reasons: string[] = [];
  let score = 0;
  const aLast = lastName(a);
  const bLast = lastName(b);
  const aFirst = firstName(a);
  const bFirst = firstName(b);
  if (aLast && aLast === bLast) {
    score += 40;
    reasons.push("Same family name");
  }
  if (aFirst && aFirst === bFirst) {
    score += 30;
    reasons.push("Same given name");
  } else if (aFirst && bFirst && (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst))) {
    score += 20;
    reasons.push("Given names share a start");
  }
  const aCompact = compact(a.displayName);
  const bCompact = compact(b.displayName);
  if (aCompact && bCompact && (aCompact.includes(bCompact) || bCompact.includes(aCompact))) {
    score += 25;
    reasons.push("One name is inside the other");
  }
  const aBirth = yearOf(a.birthDate);
  const bBirth = yearOf(b.birthDate);
  if (aBirth && bBirth) {
    if (aBirth === bBirth) {
      score += 20;
      reasons.push("Same birth year");
    } else if (Math.abs(aBirth - bBirth) > 3) {
      score -= 80;
      reasons.push("Birth years disagree");
    }
  }
  const aMd = monthDayOf(a.birthDate);
  const bMd = monthDayOf(b.birthDate);
  if (aMd && bMd && aMd === bMd) {
    score += 10;
    reasons.push("Same birthday");
  }
  const aDeath = yearOf(a.deathDate);
  const bDeath = yearOf(b.deathDate);
  if (aDeath && bDeath && Math.abs(aDeath - bDeath) > 2) {
    score -= 50;
    reasons.push("Death years disagree");
  }
  return { score, reasons };
}

export function suggestDuplicates(people: DuplicatePerson[], threshold = 55): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const left = people[i];
      const right = people[j];
      const { score, reasons } = scoreDuplicate(left, right);
      if (score < threshold) continue;
      const keepFirst = (left.displayName.length > right.displayName.length ? left : right);
      const drop = keepFirst.id === left.id ? right : left;
      pairs.push({
        keepId: keepFirst.id,
        dropId: drop.id,
        keepName: keepFirst.displayName,
        dropName: drop.displayName,
        score,
        reasons,
      });
    }
  }
  return pairs.sort((a, b) => b.score - a.score || a.keepName.localeCompare(b.keepName));
}
