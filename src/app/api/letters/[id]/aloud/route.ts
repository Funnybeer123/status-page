import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { aloudParagraphs, readAloudHeading } from "@/lib/readAloud";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  return NextResponse.json({
    letter,
    paragraphs: aloudParagraphs(letter.transcript),
    heading: readAloudHeading(letter.title),
  });
}
