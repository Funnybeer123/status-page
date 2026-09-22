import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingManifestHeading, voyagesMissingManifest } from "@/lib/scans";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const voyages = await prisma.voyage.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { departedOn: "asc" },
  });
  const missing = voyagesMissingManifest(voyages);
  return NextResponse.json({ voyages: missing, heading: missingManifestHeading(missing.length) });
}
