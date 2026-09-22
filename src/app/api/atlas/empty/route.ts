import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { atlasChronicleHref, atlasNeedsSummary, emptyAtlasHeading } from "@/lib/atlas";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: true, events: true, photos: true },
    orderBy: { name: "asc" },
  });
  const empty = places
    .filter((place) => atlasNeedsSummary({ residents: place.residences.length, events: place.events.length, photos: place.photos.length }))
    .map((place) => ({ id: place.id, name: place.name, href: atlasChronicleHref(place.id) }));
  return NextResponse.json({ places: empty, heading: emptyAtlasHeading(empty.length) });
}
