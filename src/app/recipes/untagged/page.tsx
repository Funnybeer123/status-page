import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { untaggedRecipesHeading } from "@/lib/recipeHoliday";

export default async function UntaggedRecipesPage() {
  const ctx = await requireFamily();
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, holidayId: null },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="untagged-recipes-heading">{untaggedRecipesHeading(recipes.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="untagged-recipes">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <Link href={`/letters/${recipe.id}`} className="text-seal">{recipe.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
