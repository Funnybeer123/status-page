import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupSurnames } from "@/lib/surnames";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({ surnames: groupSurnames(people) });
}
