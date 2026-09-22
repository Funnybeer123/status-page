export function recipeHolidayLine(recipe?: string | null, holiday?: string | null) {
  const dish = recipe?.trim() || "A recipe";
  const day = holiday?.trim();
  return day ? `${dish} · for ${day}` : dish;
}

export function untaggedRecipesHeading(count: number) {
  if (!count) return "Every recipe has a holiday";
  if (count === 1) return "1 recipe still needs a holiday";
  return `${count} recipes still need a holiday`;
}

export function holidayCookbookHeading(count: number) {
  if (!count) return "No holiday recipes yet";
  if (count === 1) return "1 holiday recipe";
  return `${count} holiday recipes`;
}

export function compileHolidayCookbook<
  T extends { title: string; holiday?: { id: string; title: string } | null },
>(recipes: T[]) {
  const groups = new Map<string, { id: string; holiday: string; recipes: T[] }>();
  for (const recipe of recipes) {
    if (!recipe.holiday?.title) continue;
    const existing = groups.get(recipe.holiday.id) ?? {
      id: recipe.holiday.id,
      holiday: recipe.holiday.title,
      recipes: [],
    };
    existing.recipes.push(recipe);
    groups.set(recipe.holiday.id, existing);
  }
  return [...groups.values()].sort((a, b) => a.holiday.localeCompare(b.holiday));
}
