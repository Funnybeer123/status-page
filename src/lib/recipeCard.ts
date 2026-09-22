import { recipeHolidayLine } from "@/lib/recipeHoliday";

export function recipeCardHeading(title?: string | null) {
  const dish = title?.trim();
  return dish ? `Recipe card · ${dish}` : "Recipe card";
}

export function recipeCookLine(cooks: Array<string | null | undefined> = []) {
  const names = cooks.map((name) => name?.trim()).filter((name): name is string => Boolean(name));
  if (!names.length) return "Cook unknown";
  return `Cooked by ${names.join(", ")}`;
}

export function recipeCardHolidayLine(holiday?: string | null) {
  const day = holiday?.trim();
  return day ? `For ${day}` : "No holiday yet";
}

export function recipeCardPrintLine(title?: string | null, cooks: Array<string | null | undefined> = [], holiday?: string | null) {
  return `${recipeHolidayLine(title, holiday)} · ${recipeCookLine(cooks)}`;
}

export function recipeCardsHeading(count: number) {
  if (!count) return "No recipe cards yet";
  if (count === 1) return "1 recipe card";
  return `${count} recipe cards`;
}

export function missingCookHeading(count: number) {
  if (!count) return "Every recipe names a cook";
  if (count === 1) return "1 recipe still needs a cook";
  return `${count} recipes still need a cook`;
}
