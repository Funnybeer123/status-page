import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileHolidayCookbook, holidayCookbookHeading, recipeHolidayLine } from "@/lib/recipeHoliday";

export default async function HolidayCookbookPage() {
  const ctx = await requireFamily();
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, holidayId: { not: null } },
    include: { holiday: true },
    orderBy: { title: "asc" },
  });
  const groups = compileHolidayCookbook(recipes);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="holiday-cookbook-heading">{holidayCookbookHeading(recipes.length)}</h1>
      <p className="mt-3 text-bark">
        <Link href="/recipes" className="text-seal">The cookbook</Link>
        {" · "}
        <Link href="/recipes/untagged" className="text-seal">Recipes without a holiday</Link>
        {" · "}
        <Link href="/holidays" className="text-seal">Family holidays</Link>
      </p>
      <div className="mt-10 space-y-8" data-testid="holiday-cookbook">
        {groups.map((group) => (
          <section key={group.id}>
            <h2 className="font-display text-3xl">{group.holiday}</h2>
            <ul className="mt-3 space-y-2">
              {group.recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link href={`/letters/${recipe.id}`} className="text-seal">
                    {recipeHolidayLine(recipe.title, recipe.holiday?.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
