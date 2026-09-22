import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { scanHeading } from "@/lib/scans";

const schema = z.object({
  voyageId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a voyage and a ship manifest." }, { status: 400 });
  const [voyage, asset] = await Promise.all([
    prisma.voyage.findFirst({ where: { id: body.data.voyageId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!voyage) return NextResponse.json({ error: "Voyage not found." }, { status: 404 });
  if (!asset) return NextResponse.json({ error: "Manifest not found." }, { status: 404 });
  const updated = await prisma.voyage.update({
    where: { id: voyage.id },
    data: { assetId: asset.id },
    include: { manifest: true, people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "attached",
    entityType: "voyage",
    entityId: voyage.id,
    title: scanHeading("manifest", voyage.ship),
  });
  return NextResponse.json({ voyage: updated, heading: scanHeading("manifest", voyage.ship) });
}
