import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { editedLettersHeading } from "@/lib/transcriptCompare";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, revisions: { some: {} } },
    include: { revisions: { orderBy: { editedAt: "desc" }, take: 1 } },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({
    letters,
    heading: editedLettersHeading(letters.length),
  });
}
