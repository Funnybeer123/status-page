import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingPlaceNameHeading } from "@/lib/placeNames";

export default async function MissingPlaceNamesPage() {
  const ctx = await requireFamily();
  const places = (await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { names: true },
    orderBy: { name: "asc" },
  })).filter((place) => !place.names.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-place-name-heading">
        {missingPlaceNameHeading(places.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/places/names" className="text-seal">Family dictionary of places</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-place-name-list">
        {places.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <Link href={`/places/${place.id}`} className="font-display text-2xl text-seal">
              {place.name}
            </Link>
          </li>
        ))}
        {!places.length ? <li className="text-bark">{missingPlaceNameHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
