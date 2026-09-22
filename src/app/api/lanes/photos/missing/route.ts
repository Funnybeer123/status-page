import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileMemoryLane, missingLanePhotoHeading } from "@/lib/memoryLane";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: {
      residences: { include: { place: { include: { photos: { where: { deletedAt: null } } } } } },
    },
  });
  const items = [];
  for (const person of people) {
    if (hideResidenceForViewer(ctx.role, person)) continue;
    const photos = await prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: person.id } }, placeId: { not: null } },
    });
    for (const stop of compileMemoryLane(person.residences, photos)) {
      if (!stop.photoId) items.push({ ...stop, personName: person.displayName, personId: person.id });
    }
  }
  return NextResponse.json({ heading: missingLanePhotoHeading(items.length), items });
}
