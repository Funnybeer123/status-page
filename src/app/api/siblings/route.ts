import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { siblingKind } from "@/lib/rels";
import { birthOrder, siblingSetsHeading } from "@/lib/birthOrder";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const seen = new Set<string>();
  const sets: { id: string; names: string[]; href: string }[] = [];
  for (const person of people) {
    if (hideMinorDetails(ctx.role, person)) continue;
    const members = people.filter(
      (row) => !hideMinorDetails(ctx.role, row) && (row.id === person.id || siblingKind(person.id, row.id, relationships)),
    );
    if (members.length < 2) continue;
    const key = members.map((row) => row.id).sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    const ordered = birthOrder(members);
    sets.push({
      id: person.id,
      names: ordered.map((row) => row.displayName),
      href: `/siblings/${person.id}`,
    });
  }
  return NextResponse.json({ sets, heading: siblingSetsHeading(sets.length) });
}
