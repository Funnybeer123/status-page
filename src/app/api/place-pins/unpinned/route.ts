import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unpinnedLettersHeading } from "@/lib/placePin";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: {
      familyId: ctx.family.id,
      deletedAt: null,
      kind: { in: ["letter", "note"] },
      placePins: { none: {} },
    },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ letters, heading: unpinnedLettersHeading(letters.length) });
}
