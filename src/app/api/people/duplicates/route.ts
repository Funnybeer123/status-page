import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { suggestDuplicates } from "@/lib/duplicates";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({ where: { familyId: ctx.family.id } });
  return NextResponse.json({ pairs: suggestDuplicates(people) });
}
