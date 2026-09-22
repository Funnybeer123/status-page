import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { favoritePhotoHeading, favoritesHeading } from "@/lib/favoritePhoto";

export default async function FavoritesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, favoriteAssetId: { not: null } },
    include: { favoriteAsset: { include: { tags: { include: { person: true } } } } },
    orderBy: { displayName: "asc" },
  });
  const items = people.filter(
    (person) =>
      person.favoriteAsset &&
      !hidePhotoFromAudience(
        ctx.role,
        person.favoriteAsset.tags.map((tag) => tag.person),
      ),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="favorites-heading">
        {favoritesHeading(items.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/favorites/missing" className="text-seal">People without a favorite</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="favorites-list">
        {items.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {favoritePhotoHeading(person.displayName)}
            </Link>
            <p className="text-bark">{person.favoriteAsset?.title}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{favoritesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
