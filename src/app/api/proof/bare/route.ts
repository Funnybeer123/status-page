import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bareProofHeading, proofHasImage } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, asset: true, document: { include: { asset: true } } },
    orderBy: { claim: "asc" },
  });
  const bare = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person) && !proofHasImage(item));
  return NextResponse.json({
    heading: bareProofHeading(bare.length),
    facts: bare.map((item) => ({ id: item.id, claim: item.claim })),
  });
}
