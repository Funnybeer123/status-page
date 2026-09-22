import Link from "next/link";
import { notFound } from "next/navigation";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recipeCardHeading, recipeCardHolidayLine, recipeCardPrintLine, recipeCookLine } from "@/lib/recipeCard";

export default async function RecipeCardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const recipe = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, kind: DocKind.recipe, deletedAt: null },
    include: { people: { include: { person: true } }, holiday: true },
  });
  if (!recipe) notFound();
  const cooks = recipe.people.map((item) => item.person.displayName);
  return (
    <AppShell>
      <article className="mx-auto max-w-xl print:max-w-none paper-card p-8" data-testid="recipe-card">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable recipe card</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="recipe-card-heading">
          {recipeCardHeading(recipe.title)}
        </h1>
        <p className="mt-4 text-xl text-bark" data-testid="recipe-card-cook">
          {recipeCookLine(cooks)}
        </p>
        <p className="mt-2 font-sans text-sm uppercase tracking-[0.2em] text-gold" data-testid="recipe-card-holiday">
          {recipeCardHolidayLine(recipe.holiday?.title)}
        </p>
        <p className="mt-6 whitespace-pre-wrap text-bark">{recipe.transcript}</p>
        <p className="mt-8 font-sans text-sm text-bark print:hidden" data-testid="recipe-card-print-line">
          {recipeCardPrintLine(recipe.title, cooks, recipe.holiday?.title)}
        </p>
        <p className="mt-8 font-sans text-sm print:hidden">
          <Link href="/recipes" className="text-seal">Family cookbook</Link>
          {" · "}
          <Link href="/recipes/holidays" className="text-seal">Holiday cookbook</Link>
          {" · "}
          <Link href="/recipes/cards" className="text-seal">All recipe cards</Link>
        </p>
      </article>
      <CiteBlock title={recipeCardHeading(recipe.title)} path={`/recipes/${recipe.id}/card`} />
    </AppShell>
  );
}
