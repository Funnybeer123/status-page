import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { pickHomeMotto } from "@/lib/homeMotto";
import { tableTentHeading, tentMottoLine } from "@/lib/tableTent";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const mottos = await prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } });
  const motto = pickHomeMotto(mottos);
  return NextResponse.json({
    reunion: { id: reunion.id, title: reunion.title, place: reunion.place },
    motto: motto ? { id: motto.id, text: motto.text } : null,
    heading: tableTentHeading(reunion.title, motto?.text),
    line: tentMottoLine(motto?.text),
  });
}
