import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingFavoriteHeading } from "@/lib/favoritePhoto";

export default async function MissingFavoritesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, favoriteAssetId: null, tags: { some: {} } },
    orderBy: { displayName: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-favorites-heading">
        {missingFavoriteHeading(people.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-favorites-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!people.length ? <li className="text-bark">{missingFavoriteHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
