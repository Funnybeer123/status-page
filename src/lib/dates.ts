export function formatDate(value?: Date | string | null, fallback = "Date unknown") {
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatYear(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getUTCFullYear());
}

export function lifespan(birth?: Date | string | null, death?: Date | string | null) {
  const born = formatYear(birth);
  const died = formatYear(death);
  if (born && died) return `${born} – ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return "";
}

export function ageAt(birth?: Date | string | null, on?: Date | string | null) {
  if (!birth || !on) return null;
  const born = typeof birth === "string" ? new Date(birth) : birth;
  const date = typeof on === "string" ? new Date(on) : on;
  if (Number.isNaN(born.getTime()) || Number.isNaN(date.getTime())) return null;
  let age = date.getUTCFullYear() - born.getUTCFullYear();
  const monthDelta = date.getUTCMonth() - born.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && date.getUTCDate() < born.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function ageLabel(birth?: Date | string | null, on?: Date | string | null) {
  const age = ageAt(birth, on);
  return age == null ? "" : `age ${age}`;
}

export function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function qualifyDate(value?: Date | string | null, precision?: string | null, fallback = "Date unknown") {
  const formatted = formatDate(value, fallback);
  if (!value || formatted === fallback) return formatted;
  if (precision === "circa") return `about ${formatted}`;
  if (precision === "before") return `before ${formatted}`;
  if (precision === "after") return `after ${formatted}`;
  return formatted;
}

export function formatMonthDay(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}
