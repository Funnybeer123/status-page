import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { deedHeading } from "@/lib/deed";

const schema = z.object({
  landId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a land record and a deed image." }, { status: 400 });
  const [record, asset] = await Promise.all([
    prisma.landRecord.findFirst({ where: { id: body.data.landId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!record) return NextResponse.json({ error: "Land record not found." }, { status: 404 });
  if (!asset) return NextResponse.json({ error: "Deed image not found." }, { status: 404 });
  const updated = await prisma.landRecord.update({
    where: { id: record.id },
    data: { assetId: asset.id },
    include: { deed: true, person: true, home: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "attached",
    entityType: "land-deed",
    entityId: record.id,
    title: deedHeading(record.title),
  });
  return NextResponse.json({ land: updated, heading: deedHeading(record.title) });
}
