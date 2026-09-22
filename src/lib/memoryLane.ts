import { formatYear } from "@/lib/dates";
import { sortResidences } from "@/lib/residenceMap";

export function memoryLaneHeading(name?: string | null) {
  const who = name?.trim();
  return who ? `Memory lane · ${who}` : "Memory lane";
}

export function memoryLaneStopLine(
  place?: string | null,
  startedAt?: Date | string | null,
  endedAt?: Date | string | null,
) {
  const where = place?.trim() || "An unnamed place";
  const from = formatYear(startedAt) || "?";
  const to = formatYear(endedAt) || "still there";
  return `${where} · ${from}–${to}`;
}

export function missingLaneHeading(count: number) {
  if (!count) return "Everyone with a home has a memory-lane walk";
  if (count === 1) return "1 person still needs a place on memory lane";
  return `${count} people still need a place on memory lane`;
}

export function missingLanePhotoHeading(count: number) {
  if (!count) return "Every memory-lane stop has a photograph";
  if (count === 1) return "1 memory-lane stop still needs a photograph";
  return `${count} memory-lane stops still need a photograph`;
}

export function lanesIndexHeading(count: number) {
  if (!count) return "No memory-lane walks yet";
  if (count === 1) return "1 memory-lane walk";
  return `${count} memory-lane walks`;
}

export function pickLanePhoto<
  T extends { id: string; title?: string | null; storagePath?: string | null; placeId?: string | null },
>(placeId: string, placePhotos: T[] = [], personPhotos: T[] = []) {
  return placePhotos[0] || personPhotos.find((photo) => photo.placeId === placeId) || null;
}

export function compileMemoryLane<
  T extends {
    id: string;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    notes?: string | null;
    place: {
      id: string;
      name: string;
      locality?: string | null;
      photos?: Array<{ id: string; title?: string | null; storagePath?: string | null; placeId?: string | null }>;
    };
  },
>(
  residences: T[],
  personPhotos: Array<{ id: string; title?: string | null; storagePath?: string | null; placeId?: string | null }> = [],
) {
  return sortResidences(residences).map((row, index) => {
    const photo = pickLanePhoto(row.place.id, row.place.photos || [], personPhotos);
    return {
      id: row.id,
      stop: index + 1,
      placeId: row.place.id,
      placeName: row.place.name,
      locality: row.place.locality || null,
      startedAt: row.startedAt || null,
      endedAt: row.endedAt || null,
      notes: row.notes || null,
      line: memoryLaneStopLine(row.place.name, row.startedAt, row.endedAt),
      photoId: photo?.id || null,
      photoTitle: photo?.title || null,
      photoPath: photo?.storagePath || null,
      href: `/places/${row.place.id}`,
    };
  });
}
