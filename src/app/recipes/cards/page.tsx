import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recipeCardHeading, recipeCardPrintLine, recipeCardsHeading } from "@/lib/recipeCard";

export default async function RecipeCardsPage() {
  const ctx = await requireFamily();
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, deletedAt: null },
    include: { people: { include: { person: true } }, holiday: true },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="recipe-cards-heading">
        {recipeCardsHeading(recipes.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/recipes" className="text-seal">Family cookbook</Link>
        {" · "}
        <Link href="/recipes/cards/missing" className="text-seal">Recipes without a cook</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="recipe-cards-list">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="paper-card p-5">
            <Link href={`/recipes/${recipe.id}/card`} className="font-display text-2xl text-seal">
              {recipeCardHeading(recipe.title)}
            </Link>
            <p className="text-bark">
              {recipeCardPrintLine(
                recipe.title,
                recipe.people.map((item) => item.person.displayName),
                recipe.holiday?.title,
              )}
            </p>
          </li>
        ))}
        {!recipes.length ? <li className="text-bark">{recipeCardsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
