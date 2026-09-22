import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { homeDuplicateHeading, suggestHomeDuplicates } from "@/lib/homeDuplicates";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const homes = await prisma.familyHome.findMany({
    where: { familyId: ctx.family.id },
    select: { id: true, title: true, line: true, locality: true },
    orderBy: { title: "asc" },
  });
  const groups = suggestHomeDuplicates(homes);
  return NextResponse.json({
    groups,
    heading: homeDuplicateHeading(groups.length),
  });
}
