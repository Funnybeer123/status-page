import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { atlasChronicleHref, atlasHeading, atlasSummary } from "@/lib/atlas";
import { placeLabel } from "@/lib/places";

export default async function AtlasPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: true, events: true, photos: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="atlas-heading">{atlasHeading(places.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Every place, a short summary, and a door into the chronicle.</p>
      <ul className="mt-10 space-y-3" data-testid="atlas-list">
        {places.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <Link href={atlasChronicleHref(place.id)} className="font-display text-2xl text-seal" data-testid={`atlas-chronicle-${place.id}`}>
              {placeLabel(place)}
            </Link>
            <p className="text-bark">
              {atlasSummary({
                residents: place.residences.length,
                events: place.events.length,
                photos: place.photos.length,
              })}
            </p>
          </li>
        ))}
        {!places.length ? <li className="text-bark">The family atlas is empty.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/atlas/empty" className="text-seal">Places still needing a summary</Link>
        {" · "}
        <Link href="/places" className="text-seal">Places list</Link>
      </p>
    </AppShell>
  );
}
