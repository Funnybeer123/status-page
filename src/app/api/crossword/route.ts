import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCrossword, crosswordHeading, emptyCrosswordHeading } from "@/lib/crossword";
import { isSecretLocked } from "@/lib/secretUntil";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [letters, stories] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const clues = compileCrossword([
    ...letters
      .filter((letter) => !isSecretLocked(letter.secretUntil))
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        kind: "letter",
        body: letter.transcript,
        href: `/letters/${letter.id}`,
      })),
    ...stories.map((story) => ({
      id: story.id,
      title: story.title,
      kind: "story",
      body: story.body,
      href: `/stories/${story.id}`,
    })),
  ]);
  return NextResponse.json({
    heading: clues.length ? crosswordHeading(clues.length) : emptyCrosswordHeading(),
    clues,
  });
}
