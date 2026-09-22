import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingBirthsHeading, needsBirthDate } from "@/lib/missingBirths";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const missing = people
    .filter((person) => needsBirthDate(person) && !hideMinorDetails(ctx.role, person))
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: missingBirthsHeading(missing.length), people: missing });
}
