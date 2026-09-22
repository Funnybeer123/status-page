import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redactPeople } from "@/lib/privacy";
import { alive } from "@/lib/alive";
import { renderTreeSvg, treeSvgFilename } from "@/lib/treeSvg";
import { memberIdsForBranch, peopleInBranch, relationshipsInBranch } from "@/lib/branches";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const branchId = new URL(req.url).searchParams.get("branchId") || "";
  const [people, relationships, branches] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.familyBranch.findMany({ where: { familyId: ctx.family.id }, include: { members: true } }),
  ]);
  const memberIds = memberIdsForBranch(branches, branchId || undefined);
  const visiblePeople = peopleInBranch(people, memberIds);
  const visibleRels = relationshipsInBranch(relationships, memberIds);
  const treePeople = redactPeople(visiblePeople, ctx.role).map((person) => ({
    ...person,
    profileUrl: null,
  }));
  const svg = renderTreeSvg(treePeople, visibleRels, ctx.family.name);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${treeSvgFilename(ctx.family.name)}"`,
    },
  });
}
