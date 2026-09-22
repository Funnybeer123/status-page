import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails, hideResidenceForViewer } from "@/lib/privacy";
import { missingResidencesHeading } from "@/lib/residenceMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { residences: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter(
    (person) =>
      !hideMinorDetails(ctx.role, person) &&
      !hideResidenceForViewer(ctx.role, person) &&
      !person.residences.length,
  );
  return NextResponse.json({
    heading: missingResidencesHeading(missing.length),
    people: missing.map((person) => ({ id: person.id, displayName: person.displayName })),
  });
}
