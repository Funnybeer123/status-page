import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeLabel } from "@/lib/places";
import { hideResidenceForViewer } from "@/lib/privacy";

export default async function PlacesPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: {
      residences: { include: { person: true } },
      events: true,
    },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="places-heading">Places</h1>
      <p className="mt-3 max-w-2xl text-bark">Towns, farms, and halls — open one to see who lived there.</p>
      <ul className="mt-10 space-y-3" data-testid="places-list">
        {places.map((place) => {
          const residents = place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person));
          return (
            <li key={place.id} className="paper-card p-5">
              <Link href={`/places/${place.id}`} className="font-display text-2xl text-seal">{placeLabel(place)}</Link>
              <p className="text-bark">
                {residents.map((item) => item.person.displayName).join(", ") || "No residences recorded."}
              </p>
              <p className="font-sans text-sm text-gold">{place.events.length} dated events</p>
            </li>
          );
        })}
        {!places.length ? <li className="text-bark">Record a residence from a person page.</li> : null}
      </ul>
    </AppShell>
  );
}
