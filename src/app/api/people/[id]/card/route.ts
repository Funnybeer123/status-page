import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileIndexCard, indexCardHeading } from "@/lib/indexCard";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { alive } from "@/lib/alive";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const [person, people, relationships] = await Promise.all([
    prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (hideMinorDetails(ctx.role, person)) {
    return NextResponse.json({ error: "A living child’s index card is not shared with viewers." }, { status: 403 });
  }
  const visiblePeople = people.filter((row) => !hideMinorDetails(ctx.role, row));
  const card = compileIndexCard({
    person,
    people: visiblePeople,
    relationships,
    hideDates: shouldHideLivingFacts(ctx.role, person),
  });
  return NextResponse.json({
    heading: indexCardHeading(person.displayName),
    card,
    person,
  });
}
