import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, livingHereHeading } from "@/lib/livingHere";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const place = await prisma.place.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
  });
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  const residences = place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person));
  const people = compileLivingHere(residences);
  return NextResponse.json({
    heading: livingHereHeading(place.name, people.length),
    place: { id: place.id, name: place.name },
    people,
  });
}
