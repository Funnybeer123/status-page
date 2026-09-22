import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { missingLaneHeading } from "@/lib/memoryLane";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { residences: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !person.residences.length && !hideResidenceForViewer(ctx.role, person));
  return NextResponse.json({
    heading: missingLaneHeading(missing.length),
    people: missing.map((person) => ({ id: person.id, displayName: person.displayName })),
  });
}
