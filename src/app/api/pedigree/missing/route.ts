import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { compileDrawnPedigree, missingPedigreeHeading } from "@/lib/drawnPedigree";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const missing = visible
    .filter((person) => !compileDrawnPedigree(person.id, visible, relationships).root?.parents.length)
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: missingPedigreeHeading(missing.length), people: missing });
}
