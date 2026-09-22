import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { branchColorLine, normalizeBranchColor } from "@/lib/branchColor";

const schema = z.object({
  branchId: z.string(),
  color: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A branch color needs a color." }, { status: 400 });
  const color = normalizeBranchColor(body.data.color);
  if (!color) return NextResponse.json({ error: "That color is not one the tree can use." }, { status: 400 });
  const existing = await prisma.familyBranch.findFirst({
    where: { id: body.data.branchId, familyId: ctx.family.id },
  });
  if (!existing) return NextResponse.json({ error: "Branch not found." }, { status: 404 });
  const branch = await prisma.familyBranch.update({
    where: { id: existing.id },
    data: { color },
  });
  return NextResponse.json({ branch, line: branchColorLine(branch.name, branch.color) });
}
