import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileMemoryLane, memoryLaneHeading, missingLanePhotoHeading } from "@/lib/memoryLane";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideResidenceForViewer(ctx.role, person)) {
    return NextResponse.json({ heading: memoryLaneHeading(person.displayName), items: [], person });
  }
  const residences = await prisma.residence.findMany({
    where: { familyId: ctx.family.id, personId: person.id },
    include: { place: { include: { photos: { where: { deletedAt: null }, orderBy: { capturedAt: "asc" } } } } },
  });
  const personPhotos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: person.id } }, placeId: { not: null } },
  });
  const items = compileMemoryLane(residences, personPhotos);
  return NextResponse.json({
    heading: memoryLaneHeading(person.displayName),
    items,
    missingPhotos: missingLanePhotoHeading(items.filter((item) => !item.photoId).length),
    person,
  });
}
