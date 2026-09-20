import { prisma } from "@/lib/prisma";

export async function findOrCreatePlace(input: {
  familyId: string;
  placeId?: string | null;
  name?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
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
  if (match) return match;
  return prisma.place.create({
    data: {
      familyId: input.familyId,
      name,
      locality,
      region,
      country,
    },
  });
}

export function placeLabel(place: { name: string; locality?: string | null; region?: string | null; country?: string | null }) {
  return [place.name, place.locality, place.region, place.country].filter(Boolean).join(", ");
}
