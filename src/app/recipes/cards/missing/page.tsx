import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCookHeading } from "@/lib/recipeCard";

export default async function MissingCooksPage() {
  const ctx = await requireFamily();
  const recipes = (await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, deletedAt: null },
    include: { people: true },
    orderBy: { title: "asc" },
  })).filter((recipe) => !recipe.people.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-cook-heading">
        {missingCookHeading(recipes.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/recipes/cards" className="text-seal">Recipe cards</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-cook-list">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="paper-card p-5">
            <Link href={`/recipes/${recipe.id}/card`} className="font-display text-2xl text-seal">
              {recipe.title}
            </Link>
          </li>
        ))}
        {!recipes.length ? <li className="text-bark">{missingCookHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
