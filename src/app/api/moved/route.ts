import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/dates";
import { hideResidenceForViewer } from "@/lib/privacy";
import { movedAwayHeading, movedAwayLine } from "@/lib/dayDigest";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const residences = await prisma.residence.findMany({
    where: { familyId: ctx.family.id, endedAt: { not: null } },
    include: { person: true, place: true },
    orderBy: { endedAt: "asc" },
  });
  const items = residences
    .filter((row) => !hideResidenceForViewer(ctx.role, row.person))
    .map((row) => ({
      id: row.id,
      displayName: row.person.displayName,
      placeName: row.place.name,
      line: movedAwayLine(row.person.displayName, row.place.name, formatYear(row.endedAt) || null),
      href: `/people/${row.personId}/lane`,
    }));
  return NextResponse.json({ heading: movedAwayHeading(items.length), items });
}
