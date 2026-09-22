import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { normalizeBranchColor, uncoloredBranchesHeading } from "@/lib/branchColor";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const branches = await prisma.familyBranch.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const missing = branches.filter((branch) => !normalizeBranchColor(branch.color));
  return NextResponse.json({
    heading: uncoloredBranchesHeading(missing.length),
    branches: missing.map((branch) => ({ id: branch.id, name: branch.name })),
  });
}
