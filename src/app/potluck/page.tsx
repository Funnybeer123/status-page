import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePotluck } from "@/lib/potluck";

export default async function PotluckIndexPage() {
  const ctx = await requireFamily();
  const dishes = await prisma.reunionDish.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, recipe: true, reunion: true },
    orderBy: { title: "asc" },
  });
  const rows = compilePotluck(
    dishes.map((dish) => ({
      id: dish.id,
      title: dish.title,
      notes: dish.notes,
      personName: dish.person?.displayName ?? null,
      recipeTitle: dish.recipe?.title ?? null,
      recipeId: dish.recipeId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="potluck-index-heading">Reunion potluck</h1>
      <p className="mt-3 max-w-2xl text-bark">Every dish promised for a reunion, tied to the cookbook and to who is bringing it.</p>
      <ul className="mt-10 space-y-3" data-testid="potluck-index">
        {rows.map((dish) => {
          const reunion = dishes.find((item) => item.id === dish.id)?.reunion;
          return (
            <li key={dish.id} className="paper-card p-5">
              <p className="font-display text-2xl">{dish.title}</p>
              <p className="text-bark">{dish.line}</p>
              {reunion ? (
                <Link href={`/reunions/${reunion.id}`} className="font-sans text-sm text-seal">{reunion.title}</Link>
              ) : null}
            </li>
          );
        })}
        {!rows.length ? <li className="text-bark">No potluck dishes yet.</li> : null}
      </ul>
    </AppShell>
  );
}
