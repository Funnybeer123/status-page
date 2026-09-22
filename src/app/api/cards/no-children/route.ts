import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { compileIndexCard, noChildrenHeading } from "@/lib/indexCard";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const missing = visible
    .map((person) => ({ id: person.id, ...compileIndexCard({ person, people: visible, relationships }) }))
    .filter((card) => !card.children.length);
  return NextResponse.json({
    heading: noChildrenHeading(missing.length),
    people: missing.map((card) => ({ id: card.id, displayName: card.name })),
  });
}
