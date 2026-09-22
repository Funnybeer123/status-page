import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, livingHereHeading } from "@/lib/livingHere";

export default async function LivingPlacesPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const items = places
    .map((place) => ({
      id: place.id,
      name: place.name,
      people: compileLivingHere(place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person))),
    }))
    .filter((place) => place.people.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="living-places-heading">
        {items.length === 1 ? "1 place still has someone living there" : `${items.length} places still have someone living there`}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="living-places">
        {items.map((place) => (
          <li key={place.id} className="paper-card p-4">
            <Link href={`/places/${place.id}/living`} className="font-display text-xl text-seal">
              {livingHereHeading(place.name, place.people.length)}
            </Link>
            <p className="text-bark">{place.people.map((person) => person.displayName).join(", ")}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">No one is still living in a recorded place.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/places/living/empty" className="text-seal">Places with no one still living there</Link>
      </p>
    </AppShell>
  );
}
