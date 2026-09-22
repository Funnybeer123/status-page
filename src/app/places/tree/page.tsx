import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { nestPlaces, placeKindLabel, type NestedPlace } from "@/lib/placeTree";

function PlaceBranch({ places }: { places: NestedPlace[] }) {
  if (!places.length) return null;
  return (
    <ul className="mt-3 space-y-2 border-l border-bark/15 pl-4">
      {places.map((place) => (
        <li key={place.id}>
          <Link href={`/places/${place.id}`} className="font-display text-xl text-seal">{place.name}</Link>
          <span className="ml-2 font-sans text-sm text-gold">{placeKindLabel(place.kind)}</span>
          <PlaceBranch places={place.children} />
        </li>
      ))}
    </ul>
  );
}

export default async function PlaceTreePage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const tree = nestPlaces(places);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-tree-heading">Place tree</h1>
      <p className="mt-3 max-w-2xl text-bark">Country, then state, then county, then the towns the family named.</p>
      <div className="mt-10 paper-card p-6" data-testid="place-tree">
        <PlaceBranch places={tree} />
        {!tree.length ? <p className="text-bark">No places recorded.</p> : null}
      </div>
    </AppShell>
  );
}
