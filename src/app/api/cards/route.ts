import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { cardsHeading, compileIndexCard } from "@/lib/indexCard";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const cards = visible.map((person) => ({
    id: person.id,
    ...compileIndexCard({
      person,
      people: visible,
      relationships,
      hideDates: shouldHideLivingFacts(ctx.role, person),
    }),
  }));
  return NextResponse.json({ heading: cardsHeading(cards.length), cards });
}
