import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { clusterSurnames, surnameMapHeading } from "@/lib/surnameMap";
import { hideResidenceForViewer } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, residences] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, ...alive },
      include: { names: true },
    }),
    prisma.residence.findMany({
      where: { familyId: ctx.family.id, person: { ...alive } },
      include: { place: true, person: true },
    }),
  ]);
  const visibleHomes = residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person));
  const clusters = clusterSurnames(people, visibleHomes);
  return NextResponse.json({
    clusters,
    heading: surnameMapHeading(clusters.length),
  });
}
