import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, hideResidenceForViewer } from "@/lib/privacy";
import { addressCardHeading, addressCardLine, sortResidences } from "@/lib/residenceMap";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: true } } },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person) || hideResidenceForViewer(ctx.role, person)) {
    return NextResponse.json({ error: "That address is hidden." }, { status: 403 });
  }
  const latest = sortResidences(person.residences).at(-1);
  return NextResponse.json({
    heading: addressCardHeading(person.displayName),
    line: addressCardLine(person.displayName, latest?.place),
    place: latest?.place ?? null,
  });
}
