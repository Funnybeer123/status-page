export function firstUploadKey(value?: Date | string | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function yearsSinceFirstUpload(first?: Date | string | null, from = new Date()) {
  const key = firstUploadKey(first);
  const now = firstUploadKey(from);
  if (!key || !now) return null;
  const [year, month, day] = key.split("-").map(Number);
  const [fromYear, fromMonth, fromDay] = now.split("-").map(Number);
  let years = (fromYear || 0) - (year || 0);
  if ((fromMonth || 0) < (month || 0) || ((fromMonth || 0) === (month || 0) && (fromDay || 0) < (day || 0))) {
    years -= 1;
  }
  return Math.max(0, years);
}

export function anniversaryHeading(years?: number | null) {
  if (years == null) return "The archive has no first upload yet";
  if (years === 0) return "The archive is in its first year";
  if (years === 1) return "1 year since the first upload";
  return `${years} years since the first upload`;
}

export function emptyAnniversaryHeading() {
  return "Nothing has been uploaded yet";
}

export function anniversaryLine(years?: number | null, first?: Date | string | null) {
  const heading = anniversaryHeading(years);
  const key = firstUploadKey(first);
  return key ? `${heading} · first upload ${key}` : heading;
}
