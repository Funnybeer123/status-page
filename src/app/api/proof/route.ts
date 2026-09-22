import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { proofListHeading } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { claim: "asc" },
  });
  const visible = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  return NextResponse.json({
    heading: proofListHeading(visible.length),
    facts: visible.map((item) => ({ id: item.id, claim: item.claim, person: item.person?.displayName })),
  });
}
