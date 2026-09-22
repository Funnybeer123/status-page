export type MigrationStop = {
  id: string;
  placeId: string;
  name: string;
  startedAt: string | null;
  endedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

function iso(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function migrationPath(
  residences: {
    id: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    place: { id: string; name: string; latitude?: number | null; longitude?: number | null };
  }[],
): MigrationStop[] {
  return [...residences]
    .sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .map((item) => ({
      id: item.id,
      placeId: item.place.id,
      name: item.place.name,
      startedAt: iso(item.startedAt),
      endedAt: iso(item.endedAt),
      latitude: item.place.latitude ?? null,
      longitude: item.place.longitude ?? null,
    }));
}

export function mappedStops(stops: MigrationStop[]) {
  return stops.filter((stop) => stop.latitude != null && stop.longitude != null) as (MigrationStop & {
    latitude: number;
    longitude: number;
  })[];
}
