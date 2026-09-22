import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePostmarkMap, postmarkMapHeading } from "@/lib/postmarkMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { asset: { include: { place: true } } },
  });
  const compiled = compilePostmarkMap(
    letters.map((letter) => ({
      ...letter,
      place: letter.asset?.place || null,
    })),
  );
  return NextResponse.json({
    heading: postmarkMapHeading(compiled.placed.length),
    ...compiled,
  });
}
