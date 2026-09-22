export type BringKind = "photo" | "heirloom" | "dish";

export type BringItem = {
  id: string;
  kind: BringKind;
  title: string;
  personName?: string | null;
  notes?: string | null;
};

export function bringKindLabel(kind: string) {
  if (kind === "photo") return "Photograph";
  if (kind === "heirloom") return "Heirloom";
  return "Dish";
}

export function bringLine(kind: string, title: string, personName?: string | null) {
  const what = title.trim() || bringKindLabel(kind);
  const who = personName?.trim();
  return who ? `${what} · ${who} is bringing it` : `${what} · no one claimed yet`;
}

export function bringListHeading(count: number) {
  if (!count) return "Nothing on the bring-list yet";
  if (count === 1) return "1 thing on the bring-list";
  return `${count} things on the bring-list`;
}

export function missingBringHeading(count: number) {
  if (!count) return "Every reunion has a bring-list";
  if (count === 1) return "1 reunion still needs a bring-list";
  return `${count} reunions still need a bring-list`;
}

export function compileBringList(input: {
  brings: BringItem[];
  dishes?: { id: string; title: string; personName?: string | null; notes?: string | null }[];
}) {
  const seenDishes = new Set(
    input.brings.filter((item) => item.kind === "dish").map((item) => item.id.replace(/^dish-/, "")),
  );
  const fromDishes = (input.dishes ?? [])
    .filter((dish) => !seenDishes.has(dish.id) && !input.brings.some((item) => item.id === `dish-${dish.id}`))
    .map((dish) => ({
      id: `dish-${dish.id}`,
      kind: "dish" as const,
      title: dish.title,
      personName: dish.personName,
      notes: dish.notes,
    }));
  return [...input.brings, ...fromDishes].map((item) => ({
    ...item,
    line: bringLine(item.kind, item.title, item.personName),
    kindLabel: bringKindLabel(item.kind),
  }));
}
