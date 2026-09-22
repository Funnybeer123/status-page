import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasPostmark, postmarkLine, postmarksHeading, postmarkWrittenLine } from "@/lib/postmark";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const items = letters.filter(hasPostmark).map((letter) => ({
    id: letter.id,
    title: letter.title,
    line: postmarkLine(letter.stampText, letter.postmarkedAt),
    written: postmarkWrittenLine(letter.writtenAt, letter.stampText, letter.postmarkedAt),
    href: `/letters/${letter.id}`,
  }));
  return NextResponse.json({ heading: postmarksHeading(items.length), letters: items });
}
