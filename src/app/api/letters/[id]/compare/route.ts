import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compareHeading, compareSideLabel, hasEdits, latestRevision } from "@/lib/transcriptCompare";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { revisions: { include: { editedBy: { select: { name: true } } }, orderBy: { editedAt: "desc" } } },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const earlier = latestRevision(letter.revisions);
  return NextResponse.json({
    heading: compareHeading(),
    currentLabel: compareSideLabel("current"),
    earlierLabel: compareSideLabel("earlier"),
    edited: hasEdits(letter.revisions),
    current: letter.transcript,
    earlier: earlier?.transcript ?? null,
    letter: { id: letter.id, title: letter.title },
  });
}
