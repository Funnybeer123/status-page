import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeLabel } from "@/lib/places";
import { mapBounds, projectPoint } from "@/lib/geocode";
import { formatDate } from "@/lib/dates";

export default async function PhotoMapPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", placeId: { not: null } },
    include: { place: true, tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  const mapped = photos.filter((photo) => photo.place?.latitude != null && photo.place?.longitude != null);
  const bounds = mapBounds(mapped.map((photo) => ({ latitude: photo.place!.latitude!, longitude: photo.place!.longitude! })));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="photo-map-heading">Where the photographs were taken</h1>
      <p className="mt-3 max-w-2xl text-bark">
        The camera’s places, not the houses people lived in.{" "}
        <Link href="/map" className="text-seal">Places they lived</Link>.
      </p>
      {bounds ? (
        <div className="paper-card mt-8 overflow-hidden" data-testid="photo-map">
          <svg viewBox="0 0 800 360" className="h-80 w-full bg-[#d7e4cc]" role="img" aria-label="Photograph locations">
            {mapped.map((photo) => {
              const point = projectPoint(
                { latitude: photo.place!.latitude!, longitude: photo.place!.longitude! },
                bounds,
                800,
                360,
              );
              return (
                <g key={photo.id}>
                  <circle cx={point.x} cy={point.y} r="7" fill="#8f3d2c" />
                  <text x={point.x + 10} y={point.y + 4} className="fill-bark" fontSize="12">
                    {photo.title || photo.place?.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="photo-map-list">
        {photos.map((photo) => (
          <li key={photo.id} className="paper-card p-5">
            <Link href={`/archive/${photo.id}`} className="font-display text-2xl text-seal">{photo.title || "A photograph"}</Link>
            <p className="text-bark">{photo.place ? placeLabel(photo.place) : ""}</p>
            <p className="font-sans text-sm text-gold">
              {formatDate(photo.capturedAt, "Year unknown")}
              {photo.tags.length ? ` · ${photo.tags.map((tag) => tag.person.displayName).join(", ")}` : ""}
            </p>
          </li>
        ))}
        {!photos.length ? <li className="text-bark">Mark where a photograph was taken from the archive page.</li> : null}
      </ul>
    </AppShell>
  );
}
