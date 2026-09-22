import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { huntBadgeLine, huntFinishersHeading } from "@/lib/huntBadge";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const hunt = await prisma.hunt.findFirst({ where: { id, familyId: ctx.family.id } });
  if (!hunt) return NextResponse.json({ error: "Hunt not found." }, { status: 404 });
  const finish = await prisma.huntFinish.upsert({
    where: { huntId_userId: { huntId: hunt.id, userId: ctx.session.user.id } },
    create: { huntId: hunt.id, userId: ctx.session.user.id, familyId: ctx.family.id },
    update: {},
    include: { user: { select: { name: true } }, hunt: true },
  });
  const finishes = await prisma.huntFinish.findMany({
    where: { huntId: hunt.id },
    include: { user: { select: { name: true } } },
    orderBy: { finishedAt: "asc" },
  });
  return NextResponse.json({
    finish,
    line: huntBadgeLine(finish.user.name || "A relative", hunt.title),
    heading: huntFinishersHeading(finishes.length),
    finishes,
  });
}
