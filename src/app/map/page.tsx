import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeLabel } from "@/lib/places";
import { mapBounds, osmBrowseUrl, projectPoint } from "@/lib/geocode";
import { hideResidenceForViewer } from "@/lib/privacy";

export default async function MapPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: {
      residences: { include: { person: true } },
      events: true,
    },
    orderBy: { name: "asc" },
  });
  const visible = places.map((place) => ({
    ...place,
    residences: place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person)),
  }));
  const mapped = visible.filter((place) => place.latitude != null && place.longitude != null);
  const points = mapped.map((place) => ({ latitude: place.latitude!, longitude: place.longitude! }));
  const bounds = mapBounds(points);
  const browse = osmBrowseUrl(points);

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="map-heading">Places they lived</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every named place on the archive, with the people who lived or marked an event there.
      </p>
      {bounds ? (
        <div className="paper-card mt-8 overflow-hidden" data-testid="family-map">
          <svg viewBox="0 0 800 360" className="h-80 w-full bg-[#d7e4cc]" role="img" aria-label="Places the family lived">
            <text x="24" y="28" className="fill-bark" fontSize="12">
              Iowa and the towns already on the archive
            </text>
            {mapped.map((place) => {
              const point = projectPoint(
                { latitude: place.latitude!, longitude: place.longitude! },
                bounds,
                800,
                360,
              );
              return (
                <g key={place.id}>
                  <circle cx={point.x} cy={point.y} r="7" className="fill-seal" />
                  <text x={point.x + 12} y={point.y + 4} className="fill-ink" fontSize="14">
                    {place.name}
                  </text>
                </g>
              );
            })}
          </svg>
          {browse ? (
            <p className="border-t border-bark/10 px-4 py-3 font-sans text-sm">
              <a href={browse} className="text-seal" target="_blank" rel="noreferrer">
                Open these coordinates on OpenStreetMap
              </a>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-8 text-bark">Add a town or a known Iowa place and it will appear on the map.</p>
      )}
      <ul className="mt-10 space-y-4" data-testid="map-places">
        {visible.map((place) => (
          <li key={place.id} className="paper-card p-5">
            <h2 className="font-display text-2xl">
              <Link href={`/places/${place.id}`} className="text-seal">{placeLabel(place)}</Link>
            </h2>
            {place.latitude != null && place.longitude != null ? (
              <p className="font-sans text-sm text-bark">
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </p>
            ) : null}
            <p className="mt-2 text-bark">
              {place.residences.map((item) => item.person.displayName).join(", ") || "No residences recorded."}
            </p>
            <p className="mt-1 font-sans text-sm text-gold">{place.events.length} dated events</p>
            {place.residences[0] ? (
              <Link href={`/people/${place.residences[0].personId}`} className="mt-2 inline-block font-sans text-sm text-seal">
                Open a person who lived here
              </Link>
            ) : null}
          </li>
        ))}
        {!visible.length ? <li className="text-bark">No places yet. Record a residence from a person page.</li> : null}
      </ul>
    </AppShell>
  );
}
