import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clueAnswerHref, clueCitationLine, compileHuntClue, huntHeading } from "@/lib/hunt";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const hunt = await prisma.hunt.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      clues: { include: { document: true, asset: true, place: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!hunt) return NextResponse.json({ error: "Hunt not found." }, { status: 404 });
  const clues = hunt.clues.map((clue) => ({
    ...compileHuntClue({
      id: clue.id,
      clue: clue.clue,
      targetKind: clue.targetKind,
      answer: clue.answer,
      citation: clue.citation,
      documentTitle: clue.document?.title,
      assetTitle: clue.asset?.title,
      placeName: clue.place?.name,
    }),
    href: clueAnswerHref(clue),
    citationLine: clueCitationLine({
      clue: clue.clue,
      targetKind: clue.targetKind,
      answer: clue.answer,
      citation: clue.citation,
      documentTitle: clue.document?.title,
      assetTitle: clue.asset?.title,
      placeName: clue.place?.name,
    }),
  }));
  return NextResponse.json({
    hunt,
    clues,
    heading: huntHeading(hunt.title, clues.length),
  });
}
