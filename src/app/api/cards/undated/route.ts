import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hasCardDates, undatedCardsHeading } from "@/lib/indexCard";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !hideMinorDetails(ctx.role, person) && !hasCardDates(person));
  return NextResponse.json({
    heading: undatedCardsHeading(missing.length),
    people: missing.map((person) => ({ id: person.id, displayName: person.displayName })),
  });
}
