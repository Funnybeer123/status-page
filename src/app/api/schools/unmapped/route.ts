import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clusterSchools, unmappedSchoolsHeading } from "@/lib/schoolMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const schools = await prisma.schooling.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const mapped = new Set(clusterSchools(schools).map((cluster) => cluster.school.toLowerCase()));
  const missing = schools.filter((row) => !mapped.has(row.school.trim().toLowerCase()));
  return NextResponse.json({ schools: missing, heading: unmappedSchoolsHeading(missing.length) });
}
