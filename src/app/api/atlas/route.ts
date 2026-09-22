import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { atlasChronicleHref, atlasHeading, atlasSummary } from "@/lib/atlas";
import { placeLabel } from "@/lib/places";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: true, events: true, photos: true },
    orderBy: { name: "asc" },
  });
  const atlas = places.map((place) => {
    const counts = { residents: place.residences.length, events: place.events.length, photos: place.photos.length };
    return {
      id: place.id,
      name: place.name,
      label: placeLabel(place),
      summary: atlasSummary(counts),
      href: atlasChronicleHref(place.id),
      counts,
    };
  });
  return NextResponse.json({ places: atlas, heading: atlasHeading(atlas.length) });
}
