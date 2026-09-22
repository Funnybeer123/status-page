import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, emptyLivingHereHeading } from "@/lib/livingHere";

export default async function EmptyLivingPlacesPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const empty = places.filter(
    (place) => !compileLivingHere(place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person))).length,
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-living-heading">
        {emptyLivingHereHeading(empty.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="empty-living-places">
        {empty.map((place) => (
          <li key={place.id}>
            <Link href={`/places/${place.id}`} className="text-seal">{place.name}</Link>
          </li>
        ))}
        {!empty.length ? <li className="text-bark">{emptyLivingHereHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
