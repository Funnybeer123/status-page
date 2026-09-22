import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { householdsMissingScan, missingScanHeading } from "@/lib/scans";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const households = await prisma.censusHousehold.findMany({
    where: { familyId: ctx.family.id },
    orderBy: [{ year: "asc" }, { place: "asc" }],
  });
  const missing = householdsMissingScan(households);
  return NextResponse.json({ households: missing, heading: missingScanHeading(missing.length) });
}
