import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileProofBoard, proofBoardHeading } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const citation = await prisma.citation.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      person: true,
      document: { include: { asset: true } },
      asset: true,
      event: true,
      name: true,
      story: true,
    },
  });
  if (!citation) return NextResponse.json({ error: "Fact not found." }, { status: 404 });
  if (shouldHideLivingFacts(ctx.role, citation.person)) {
    return NextResponse.json({ error: "That fact is hidden for living people." }, { status: 403 });
  }
  const others = await prisma.citation.findMany({
    where: { familyId: ctx.family.id, claim: citation.claim },
    include: {
      person: true,
      document: { include: { asset: true } },
      asset: true,
    },
  });
  const visible = others.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  const board = compileProofBoard(citation, visible);
  return NextResponse.json({
    heading: proofBoardHeading(citation.claim),
    citation,
    citations: board.citations,
    images: board.images,
    hasImage: board.hasImage,
  });
}
