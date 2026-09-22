import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { generationDepth } from "@/lib/generationDepth";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const chart = generationDepth(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
  );
  return NextResponse.json({
    heading: chart.heading,
    deepest: chart.deepest,
    rows: chart.rows.map((row) => ({
      generation: row.generation,
      count: row.count,
      label: row.label,
      people: row.people.map((person) => ({ id: person.id, displayName: person.displayName })),
    })),
  });
}
