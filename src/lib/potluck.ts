export type PotluckDish = {
  id: string;
  title: string;
  notes?: string | null;
  personName?: string | null;
  recipeTitle?: string | null;
  recipeId?: string | null;
};

export function compilePotluck(dishes: PotluckDish[]) {
  return dishes.map((dish) => ({
    ...dish,
    line: [
      dish.title,
      dish.personName ? `brought by ${dish.personName}` : null,
      dish.recipeTitle ? `from ${dish.recipeTitle}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}
