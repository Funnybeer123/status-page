import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { collapseOccupancy, occupancyByYear, occupancyGapHeading, occupancyGaps, occupancyHeading } from "@/lib/homeYears";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const home = await prisma.familyHome.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residents: { include: { person: true } } },
  });
  if (!home) return NextResponse.json({ error: "House not found." }, { status: 404 });
  const years = occupancyByYear(
    home.residents.map((row) => ({
      personId: row.personId,
      name: row.person.displayName,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  const gaps = occupancyGaps(years);
  return NextResponse.json({
    home: { id: home.id, title: home.title },
    years,
    spans: collapseOccupancy(years),
    gaps,
    heading: occupancyHeading(home.title),
    gapHeading: occupancyGapHeading(home.title, gaps.length),
  });
}
