import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  reunionId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a reunion photograph." }, { status: 400 });
  const [reunion, asset] = await Promise.all([
    prisma.reunionGathering.findFirst({ where: { id: body.data.reunionId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!reunion || !asset) return NextResponse.json({ error: "Reunion or photograph not found." }, { status: 404 });
  const photo = await prisma.reunionPhoto.upsert({
    where: { reunionId_assetId: { reunionId: reunion.id, assetId: asset.id } },
    create: { reunionId: reunion.id, assetId: asset.id },
    update: {},
    include: { asset: true },
  });
  return NextResponse.json({ photo });
}
