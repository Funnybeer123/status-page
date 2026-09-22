import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { compileDrawnPedigree } from "@/lib/drawnPedigree";

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
    return NextResponse.json({ error: "A living child’s pedigree is not shared with viewers." }, { status: 403 });
  }
  const visible = people.filter((row) => !hideMinorDetails(ctx.role, row));
  const pedigree = compileDrawnPedigree(person.id, visible, relationships);
  return NextResponse.json({
    heading: pedigree.heading,
    svg: pedigree.svg,
    hasParents: Boolean(pedigree.root?.parents.length),
  });
}
