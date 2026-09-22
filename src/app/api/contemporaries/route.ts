import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { contemporariesHeading, lonelyPlacesHeading, overlappingResidents } from "@/lib/contemporaries";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const rows = places.map((place) => {
    const residences = place.residences
      .filter((item) => !hideResidenceForViewer(ctx.role, item.person))
      .map((item) => ({
        id: item.id,
        personId: item.personId,
        personName: item.person.displayName,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
      }));
    const pairs = overlappingResidents(residences);
    return {
      id: place.id,
      name: place.name,
      pairs,
      heading: contemporariesHeading(place.name, pairs.length),
    };
  });
  const overlapping = rows.filter((row) => row.pairs.length);
  const lonely = rows.filter((row) => {
    const place = places.find((item) => item.id === row.id);
    return (place?.residences.length ?? 0) >= 2 && !row.pairs.length;
  });
  return NextResponse.json({
    places: overlapping,
    lonely,
    heading:
      overlapping.length === 1
        ? "1 place where people lived at the same time"
        : `${overlapping.length} places where people lived at the same time`,
    lonelyHeading: lonelyPlacesHeading(lonely.length),
  });
}
