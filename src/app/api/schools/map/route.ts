import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clusterSchools, schoolMapHeading, schoolPinLine } from "@/lib/schoolMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const schools = await prisma.schooling.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const clusters = clusterSchools(schools);
  return NextResponse.json({
    clusters,
    heading: schoolMapHeading(clusters.length),
    lines: clusters.map((cluster) => schoolPinLine(cluster.school, cluster.place, cluster.count)),
  });
}
