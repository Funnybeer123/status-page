import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecipeForm } from "@/app/recipes/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { DocKind } from "@prisma/client";

export default async function RecipesPage() {
  const ctx = await requireFamily();
  const [people, recipes] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.recipe },
      include: { people: { include: { person: true } } },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="recipes-heading">Family cookbook</h1>
      <p className="mt-3 max-w-2xl text-bark">Recipes the family still makes, tied to the person who kept them.</p>
      {canWrite(ctx.role) ? (
        <RecipeForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="recipes-list">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="paper-card p-5">
            <Link href={`/letters/${recipe.id}`} className="font-display text-2xl text-seal">{recipe.title}</Link>
            <p className="text-bark">{recipe.people.map((item) => item.person.displayName).join(", ") || "A family recipe"}</p>
            <p className="mt-2 line-clamp-3 text-bark">{recipe.transcript}</p>
          </li>
        ))}
        {!recipes.length ? <li className="text-bark">No recipes yet.</li> : null}
      </ul>
    </AppShell>
  );
}
