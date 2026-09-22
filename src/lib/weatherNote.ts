import { formatDate } from "@/lib/dates";

export function hasWeather(row?: { weather?: string | null } | null) {
  return Boolean(row?.weather?.trim());
}

export function weatherNoteLine(weather?: string | null, when?: Date | string | null) {
  const remembered = weather?.trim() || "The family did not write down the weather";
  if (!when) return remembered;
  return `${remembered} · ${formatDate(when)}`;
}

export function weatherNotesHeading(count: number) {
  if (!count) return "No weather notes yet";
  if (count === 1) return "1 weather note the family remembered";
  return `${count} weather notes the family remembered`;
}

export function missingWeatherHeading(count: number) {
  if (!count) return "Every dated photo and letter has a weather note";
  if (count === 1) return "1 dated photo or letter still needs a weather note";
  return `${count} dated photos or letters still need a weather note`;
}

export function weatherOnDayHeading(title?: string | null) {
  const name = title?.trim();
  return name ? `Weather that day · ${name}` : "Weather that day";
}
