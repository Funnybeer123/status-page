import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { postageHeading, postageLine } from "@/lib/postage";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, postage: { not: null } },
    orderBy: { writtenAt: "asc" },
  });
  return NextResponse.json({
    heading: postageHeading(letters.length),
    letters: letters.map((letter) => ({
      ...letter,
      line: postageLine(letter.postage),
    })),
  });
}
