import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingSeatingHeading } from "@/lib/seating";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id, seats: { none: {} } },
    orderBy: { happenedOn: "asc" },
  });
  return NextResponse.json({ reunions, heading: missingSeatingHeading(reunions.length) });
}
