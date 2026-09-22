import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeGapHeading, placeKindLabel, placesMissingParent } from "@/lib/placeTree";

export default async function PlaceGapsPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const gaps = placesMissingParent(places);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-gaps-heading">{placeGapHeading(gaps.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Towns, counties, and states that still need a parent on the place tree.</p>
      <ul className="mt-10 space-y-3" data-testid="place-gaps-list">
        {gaps.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <Link href={`/places/${place.id}`} className="font-display text-2xl text-seal">{place.name}</Link>
            <p className="font-sans text-sm text-gold">{placeKindLabel(place.kind)}</p>
          </li>
        ))}
        {!gaps.length ? <li className="text-bark">Every town already sits inside a county.</li> : null}
      </ul>
    </AppShell>
  );
}
