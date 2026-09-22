import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { lettersReadyHeading } from "@/lib/readAloud";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: {
      familyId: ctx.family.id,
      deletedAt: null,
      kind: { in: ["letter", "note"] },
      transcript: { not: "" },
    },
    orderBy: { writtenAt: "asc" },
  });
  return NextResponse.json({ letters, heading: lettersReadyHeading(letters.length) });
}
