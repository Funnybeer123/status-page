import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { cemeteryMapPoints } from "@/lib/cemeteryMap";
import { mapBounds, osmBrowseUrl, projectPoint } from "@/lib/geocode";

export default async function CemeteryMapPage() {
  const ctx = await requireFamily();
  const cemeteries = await prisma.cemetery.findMany({
    where: { familyId: ctx.family.id },
    include: { plots: true },
    orderBy: { name: "asc" },
  });
  const pins = cemeteryMapPoints(
    cemeteries.map((row) => ({
      id: row.id,
      name: row.name,
      locality: row.locality,
      region: row.region,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      plots: row.plots.length,
    })),
  );
  const bounds = mapBounds(pins);
  const browse = osmBrowseUrl(pins);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cemetery-map-heading">Cemetery map</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Burial grounds the family still visits.{" "}
        <Link href="/cemeteries" className="text-seal">All cemeteries</Link>
        {browse ? (
          <>
            {" · "}
            <a href={browse} className="text-seal">Open in the atlas</a>
          </>
        ) : null}
      </p>
      {bounds ? (
        <div className="paper-card mt-8 overflow-hidden" data-testid="cemetery-map">
          <svg viewBox="0 0 800 360" className="h-80 w-full bg-[#d7e4cc]" role="img" aria-label="Cemeteries on the map">
            <text x="24" y="28" className="fill-bark" fontSize="12">Where they were laid to rest</text>
            {pins.map((pin) => {
              const point = projectPoint({ latitude: pin.latitude, longitude: pin.longitude }, bounds, 800, 360);
              return (
                <g key={pin.id}>
                  <circle cx={point.x} cy={point.y} r="7" fill="#8f3d2c" />
                  <text x={point.x + 10} y={point.y + 4} className="fill-bark" fontSize="12">
                    {pin.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <p className="mt-8 text-bark">Add a cemetery with a town, and it will find a place on the map.</p>
      )}
      <ul className="mt-10 space-y-3" data-testid="cemetery-map-list">
        {pins.map((pin) => (
          <li key={pin.id} className="paper-card p-5">
            <Link href={`/cemeteries/${pin.id}`} className="font-display text-2xl text-seal">{pin.name}</Link>
            <p className="text-bark">{[pin.locality, pin.region].filter(Boolean).join(", ")}</p>
          </li>
        ))}
        {!pins.length ? <li className="text-bark">No cemeteries on the map yet.</li> : null}
      </ul>
    </AppShell>
  );
}
