import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { homeMottoHeading, pickHomeMotto } from "@/lib/homeMotto";

const schema = z.object({
  mottoId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a motto for the home." }, { status: 400 });
  const motto = await prisma.familyMotto.findFirst({
    where: { id: body.data.mottoId, familyId: ctx.family.id },
  });
  if (!motto) return NextResponse.json({ error: "Motto not found." }, { status: 404 });
  await prisma.$transaction([
    prisma.familyMotto.updateMany({ where: { familyId: ctx.family.id }, data: { preferred: false } }),
    prisma.familyMotto.update({ where: { id: motto.id }, data: { preferred: true } }),
  ]);
  const mottos = await prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } });
  return NextResponse.json({ motto: pickHomeMotto(mottos), heading: homeMottoHeading() });
}
