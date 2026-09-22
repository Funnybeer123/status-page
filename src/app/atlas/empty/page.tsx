import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { atlasChronicleHref, atlasNeedsSummary, emptyAtlasHeading } from "@/lib/atlas";

export default async function EmptyAtlasPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: true, events: true, photos: true },
    orderBy: { name: "asc" },
  });
  const empty = places.filter((place) =>
    atlasNeedsSummary({ residents: place.residences.length, events: place.events.length, photos: place.photos.length }),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="empty-atlas-heading">{emptyAtlasHeading(empty.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="empty-atlas-list">
        {empty.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <Link href={atlasChronicleHref(place.id)} className="font-display text-2xl text-seal">{place.name}</Link>
          </li>
        ))}
        {!empty.length ? <li className="text-bark">Every place in the atlas already has a summary.</li> : null}
      </ul>
    </AppShell>
  );
}
