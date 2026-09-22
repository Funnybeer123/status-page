import { prisma } from "@/lib/prisma";
import { lookupCoordinates, parseCoord } from "@/lib/geocode";
import { parseGps } from "@/lib/placeGps";

export async function findOrCreatePlace(input: {
  familyId: string;
  placeId?: string | null;
  name?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  parentId?: string | null;
  kind?: string | null;
  gps?: string | null;
}) {
  if (input.placeId) {
    const existing = await prisma.place.findFirst({
      where: { id: input.placeId, familyId: input.familyId },
    });
    if (!existing) return null;
    return existing;
  }
  const name = input.name?.trim();
  if (!name) return null;
  const locality = input.locality?.trim() || null;
  const region = input.region?.trim() || null;
  const country = input.country?.trim() || null;
  const match = await prisma.place.findFirst({
    where: { familyId: input.familyId, name, locality, region, country },
  });
  const guessed = lookupCoordinates({ name, locality, region, country });
  const parsed = parseGps(input.gps);
  const latitude = parsed?.latitude ?? parseCoord(input.latitude) ?? guessed?.latitude ?? null;
  const longitude = parsed?.longitude ?? parseCoord(input.longitude) ?? guessed?.longitude ?? null;
  const gps = input.gps?.trim() || null;
  const parent = input.parentId
    ? await prisma.place.findFirst({ where: { id: input.parentId, familyId: input.familyId } })
    : null;
  const kind = input.kind?.trim() || null;
  if (match) {
    const data: { latitude?: number; longitude?: number; parentId?: string | null; kind?: string | null; gps?: string | null } = {};
    if ((match.latitude == null || match.longitude == null) && latitude != null && longitude != null) {
      data.latitude = latitude;
      data.longitude = longitude;
    }
    if (gps && !match.gps) {
      data.gps = gps;
      if (parsed) {
        data.latitude = parsed.latitude;
        data.longitude = parsed.longitude;
      }
    }
    if (parent && !match.parentId) data.parentId = parent.id;
    if (kind && !match.kind) data.kind = kind;
    if (Object.keys(data).length) return prisma.place.update({ where: { id: match.id }, data });
    return match;
  }
  return prisma.place.create({
    data: {
      familyId: input.familyId,
      name,
      locality,
      region,
      country,
      latitude,
      longitude,
      parentId: parent?.id ?? null,
      kind,
      gps,
    },
  });
}

export function placeLabel(place: { name: string; locality?: string | null; region?: string | null; country?: string | null }) {
  return [place.name, place.locality, place.region, place.country].filter(Boolean).join(", ");
}
