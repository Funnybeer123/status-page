import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingObituaryPortraitsHeading } from "@/lib/obituaryPortrait";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const obituaries = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.obituary, deletedAt: null },
    include: { memorialPerson: true, people: { include: { person: true } } },
    orderBy: { writtenAt: "desc" },
  });
  const missing = obituaries.filter((item) => !item.memorialPersonId || !item.memorialPerson?.profileAssetId);
  return NextResponse.json({
    obituaries: missing,
    heading: missingObituaryPortraitsHeading(missing.length),
  });
}
