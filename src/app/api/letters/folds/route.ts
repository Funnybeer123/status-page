import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { foldHeading, foldLine, hasFold } from "@/lib/letterFold";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const folded = letters.filter(hasFold);
  return NextResponse.json({
    letters: folded.map((letter) => ({
      id: letter.id,
      title: letter.title,
      foldPattern: letter.foldPattern,
      line: foldLine(letter.foldPattern),
    })),
    heading: foldHeading(folded.length),
  });
}
