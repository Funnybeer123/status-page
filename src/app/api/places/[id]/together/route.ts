import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { contemporariesHeading, overlappingResidents, peopleWhoLivedTogether, residenceYears } from "@/lib/contemporaries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const place = await prisma.place.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
  });
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  const rows = place.residences
    .filter((item) => !hideResidenceForViewer(ctx.role, item.person))
    .map((item) => ({
      id: item.id,
      personId: item.personId,
      personName: item.person.displayName,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
    }));
  const pairs = overlappingResidents(rows);
  const people = peopleWhoLivedTogether(rows).map((row) => ({
    ...row,
    years: residenceYears(row.startedAt, row.endedAt),
  }));
  return NextResponse.json({
    place,
    pairs,
    people,
    heading: contemporariesHeading(place.name, pairs.length),
  });
}
