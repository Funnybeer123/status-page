import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, livingHereHeading } from "@/lib/livingHere";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const items = places
    .map((place) => {
      const people = compileLivingHere(place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person)));
      return {
        id: place.id,
        name: place.name,
        heading: livingHereHeading(place.name, people.length),
        people,
        href: `/places/${place.id}/living`,
      };
    })
    .filter((place) => place.people.length);
  return NextResponse.json({
    heading: items.length === 1 ? "1 place still has someone living there" : `${items.length} places still have someone living there`,
    places: items,
  });
}
