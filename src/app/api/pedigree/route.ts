import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { buildPedigree, flattenPedigree } from "@/lib/pedigree";
import { redactPeople } from "@/lib/privacy";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = redactPeople(people, ctx.role);
  const rootId = personId && visible.some((person) => person.id === personId)
    ? personId
    : visible[visible.length - 1]?.id;
  const tree = rootId ? buildPedigree(rootId, visible, relationships) : null;
  return NextResponse.json({
    personId: rootId ?? null,
    tree,
    rows: flattenPedigree(tree),
  });
}
