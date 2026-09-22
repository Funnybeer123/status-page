import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasGpsField, missingGpsHeading } from "@/lib/placeGps";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const missing = places.filter((place) => !hasGpsField(place));
  return NextResponse.json({ places: missing, heading: missingGpsHeading(missing.length) });
}
