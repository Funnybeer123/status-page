import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeLabel } from "@/lib/places";
import { mapBounds, osmBrowseUrl, projectPoint } from "@/lib/geocode";
import { hideResidenceForViewer } from "@/lib/privacy";
import { mappedStops, migrationPath } from "@/lib/migration";
import { formatDate } from "@/lib/dates";
import { voyageRoute, voyageRouteHeading, voyageRoutePoints } from "@/lib/voyageRoute";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string; voyageId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: {
      residences: { include: { person: true } },
      events: true,
      placePins: { include: { document: true, story: true } },
    },
    orderBy: { name: "asc" },
  });
  const person = params.personId
    ? await prisma.person.findFirst({
        where: { id: params.personId, familyId: ctx.family.id, deletedAt: null },
        include: { residences: { include: { place: true } } },
      })
    : null;
  const voyage = params.voyageId
    ? await prisma.voyage.findFirst({
        where: { id: params.voyageId, familyId: ctx.family.id },
      })
    : null;
  const route = voyage ? voyageRoute(voyage) : null;
  const path = person && !hideResidenceForViewer(ctx.role, person) ? migrationPath(person.residences) : [];
  const stops = mappedStops(path);
  const routePoints = route ? voyageRoutePoints(route) : [];
  const visible = places.map((place) => ({
    ...place,
    residences: place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person)),
  }));
  const mapped = visible.filter((place) => place.latitude != null && place.longitude != null);
  const points = [
    ...mapped.map((place) => ({ latitude: place.latitude!, longitude: place.longitude! })),
    ...stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    ...routePoints,
  ];
  const bounds = mapBounds(points);
  const browse = osmBrowseUrl(routePoints.length ? routePoints : stops.length ? stops : points);

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="map-heading">
        {voyage
          ? voyageRouteHeading(voyage.ship, voyage.departedFrom, voyage.arrivedAt)
          : person
            ? `${person.displayName}’s path`
            : "Places they lived"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        {voyage
          ? "The voyage from the departure port to the arrival port."
          : person
            ? "The towns this person lived in, in the order the family recorded them."
            : "Every named place on the archive, with the people who lived or marked an event there."}{" "}
        <Link href="/map/photos" className="text-seal">Where photographs were taken</Link>
        {" · "}
        <Link href="/map/voyages" className="text-seal">Voyage routes</Link>
        {" · "}
        <Link href="/map/pins" className="text-seal">Letters and stories on the map</Link>.
      </p>
      {bounds ? (
        <div className="paper-card mt-8 overflow-hidden" data-testid="family-map">
          <svg viewBox="0 0 800 360" className="h-80 w-full bg-[#d7e4cc]" role="img" aria-label="Places the family lived">
            <text x="24" y="28" className="fill-bark" fontSize="12">
              {person ? "The path they walked" : "Iowa and the towns already on the archive"}
            </text>
            {route && bounds ? (
              <polyline
                data-testid="voyage-route"
                points={routePoints
                  .map((stop) => {
                    const point = projectPoint(
                      { latitude: stop.latitude, longitude: stop.longitude },
                      bounds,
                      800,
                      360,
                    );
                    return `${point.x},${point.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#2c4d6b"
                strokeWidth="4"
              />
            ) : null}
            {route && bounds
              ? routePoints.map((stop) => {
                  const point = projectPoint(
                    { latitude: stop.latitude, longitude: stop.longitude },
                    bounds,
                    800,
                    360,
                  );
                  return (
                    <g key={`${stop.latitude}-${stop.longitude}`}>
                      <circle cx={point.x} cy={point.y} r="9" className="fill-seal" />
                      <text x={point.x + 12} y={point.y + 4} className="fill-ink" fontSize="14">
                        {stop.name}
                      </text>
                    </g>
                  );
                })
              : null}
            {stops.length > 1 ? (
              <polyline
                data-testid="migration-path"
                points={stops
                  .map((stop) => {
                    const point = projectPoint(
                      { latitude: stop.latitude, longitude: stop.longitude },
                      bounds,
                      800,
                      360,
                    );
                    return `${point.x},${point.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#8f3d2c"
                strokeWidth="3"
              />
            ) : null}
            {mapped.map((place) => {
              const point = projectPoint(
                { latitude: place.latitude!, longitude: place.longitude! },
                bounds,
                800,
                360,
              );
              const stopIndex = path.findIndex((stop) => stop.placeId === place.id);
              return (
                <g key={place.id}>
                  <circle cx={point.x} cy={point.y} r={stopIndex >= 0 ? 9 : 7} className={stopIndex >= 0 ? "fill-seal" : "fill-moss"} />
                  <text x={point.x + 12} y={point.y + 4} className="fill-ink" fontSize="14">
                    {stopIndex >= 0 ? `${stopIndex + 1}. ${place.name}` : place.name}
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
      {path.length ? (
        <ol className="mt-10 space-y-3" data-testid="migration-stops">
          {path.map((stop, index) => (
            <li key={stop.id} className="paper-card p-5">
              <p className="font-sans text-xs uppercase tracking-wide text-gold">Stop {index + 1}</p>
              <Link href={`/places/${stop.placeId}`} className="font-display text-2xl text-seal">{stop.name}</Link>
              <p className="font-sans text-sm text-bark">
                {formatDate(stop.startedAt, "Date unknown")}
                {stop.endedAt ? ` – ${formatDate(stop.endedAt)}` : stop.startedAt ? " – " : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : (
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
              {place.placePins.length ? (
                <ul className="mt-2 space-y-1" data-testid={`map-pins-${place.id}`}>
                  {place.placePins.map((pin) => (
                    <li key={pin.id} className="font-sans text-sm">
                      <Link href={pin.storyId ? `/stories/${pin.storyId}` : pin.documentId ? `/letters/${pin.documentId}` : `/places/${place.id}`} className="text-seal">
                        {pin.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {place.residences[0] ? (
                <Link href={`/people/${place.residences[0].personId}`} className="mt-2 inline-block font-sans text-sm text-seal">
                  Open a person who lived here
                </Link>
              ) : null}
            </li>
          ))}
          {!visible.length ? <li className="text-bark">No places yet. Record a residence from a person page.</li> : null}
        </ul>
      )}
    </AppShell>
  );
}
