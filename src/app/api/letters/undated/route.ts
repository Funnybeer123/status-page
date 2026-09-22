import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { undatedLettersHeading } from "@/lib/lettersIndex";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: [DocKind.letter, DocKind.note] }, deletedAt: null, writtenAt: null },
    include: { people: { include: { person: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ letters, heading: undatedLettersHeading(letters.length) });
}
