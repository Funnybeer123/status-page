import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { branchColorLine, branchLegendHeading, normalizeBranchColor } from "@/lib/branchColor";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const branches = await prisma.familyBranch.findMany({
    where: { familyId: ctx.family.id },
    include: { members: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const items = branches
    .filter((branch) => normalizeBranchColor(branch.color))
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      color: branch.color,
      line: branchColorLine(branch.name, branch.color),
      members: branch.members.map((member) => member.person.displayName),
    }));
  return NextResponse.json({ heading: branchLegendHeading(items.length), items });
}
