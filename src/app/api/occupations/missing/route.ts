import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { missingOccupationsHeading } from "@/lib/occupations";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, occupations: { none: {} } },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return NextResponse.json({ people: visible, heading: missingOccupationsHeading(visible.length) });
}
