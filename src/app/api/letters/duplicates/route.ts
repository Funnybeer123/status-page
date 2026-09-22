import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { letterDuplicateHeading, suggestLetterDuplicates } from "@/lib/letterDuplicates";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: [DocKind.letter, DocKind.note] }, deletedAt: null },
    include: { people: true },
  });
  const duplicates = suggestLetterDuplicates(
    letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      writtenAt: letter.writtenAt,
      transcript: letter.transcript,
      personIds: letter.people.map((row) => row.personId),
    })),
  );
  return NextResponse.json({ duplicates, heading: letterDuplicateHeading(duplicates.length) });
}
