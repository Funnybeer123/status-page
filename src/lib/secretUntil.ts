export function isoDateOnly(value?: Date | string | null) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }
  if (Number.isNaN(value.getTime())) return "";
  return value.toISOString().slice(0, 10);
}

export function todayIso(from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())).toISOString().slice(0, 10);
}

export function isSecretLocked(secretUntil?: Date | string | null, from = new Date()) {
  const until = isoDateOnly(secretUntil);
  if (!until) return false;
  return until > todayIso(from);
}

export function secretUntilLine(secretUntil?: Date | string | null, from = new Date()) {
  const until = isoDateOnly(secretUntil);
  if (!until) return "Not kept secret";
  if (isSecretLocked(secretUntil, from)) return `Kept secret until ${until}`;
  return `Opened on ${until}`;
}

export function lockedSecretsHeading(count: number) {
  if (!count) return "No journals or letters are still locked";
  if (count === 1) return "1 journal or letter is still locked";
  return `${count} journals or letters are still locked`;
}

export function secretsHeading(count: number) {
  if (!count) return "No kept-secret dates yet";
  if (count === 1) return "1 kept-secret date";
  return `${count} kept-secret dates`;
}

export function secretUnlocksToday(secretUntil?: Date | string | null, from = new Date()) {
  const until = isoDateOnly(secretUntil);
  return Boolean(until) && until === todayIso(from);
}

export function hiddenSecretBody() {
  return "This page stays closed until the date the family chose.";
}
