import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, emptyLivingHereHeading } from "@/lib/livingHere";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const empty = places
    .map((place) => ({
      id: place.id,
      name: place.name,
      people: compileLivingHere(place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person))),
      href: `/places/${place.id}`,
    }))
    .filter((place) => !place.people.length);
  return NextResponse.json({ heading: emptyLivingHereHeading(empty.length), places: empty });
}
