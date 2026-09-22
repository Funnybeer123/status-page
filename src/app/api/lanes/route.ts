import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileMemoryLane, lanesIndexHeading, memoryLaneHeading } from "@/lib/memoryLane";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: {
      residences: { include: { place: { include: { photos: { where: { deletedAt: null } } } } } },
    },
    orderBy: { displayName: "asc" },
  });
  const items = people
    .filter((person) => person.residences.length && !hideResidenceForViewer(ctx.role, person))
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      heading: memoryLaneHeading(person.displayName),
      stops: compileMemoryLane(person.residences).length,
      href: `/people/${person.id}/lane`,
    }));
  return NextResponse.json({ heading: lanesIndexHeading(items.length), items });
}
