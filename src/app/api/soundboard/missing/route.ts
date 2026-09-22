import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingSpokenHeading } from "@/lib/soundboard";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, pronunciationAssetId: null },
    orderBy: { displayName: "asc" },
  });
  const missing = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: missingSpokenHeading(missing.length), people: missing });
}
