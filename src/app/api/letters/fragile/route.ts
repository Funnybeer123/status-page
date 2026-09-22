import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { fragileLettersHeading, isFragileOriginal } from "@/lib/fragileLetter";
import { formatDate } from "@/lib/dates";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, fragileOriginal: true },
    orderBy: { writtenAt: "asc" },
  });
  return NextResponse.json({
    heading: fragileLettersHeading(letters.filter(isFragileOriginal).length),
    letters: letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      writtenAt: formatDate(letter.writtenAt, "Undated"),
    })),
  });
}
