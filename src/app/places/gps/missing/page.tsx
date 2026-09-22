import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasGpsField, missingGpsHeading } from "@/lib/placeGps";

export default async function MissingGpsPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const missing = places.filter((place) => !hasGpsField(place));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-gps-heading">{missingGpsHeading(missing.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="missing-gps">
        {missing.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <Link href={`/places/${place.id}`} className="font-display text-2xl text-seal">{place.name}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every place already has a GPS field.</li> : null}
      </ul>
    </AppShell>
  );
}
