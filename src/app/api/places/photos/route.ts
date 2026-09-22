import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { chroniclePhotosHeading } from "@/lib/placeChronicle";

const schema = z.object({
  placeId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a place and a photograph." }, { status: 400 });
  const [place, asset] = await Promise.all([
    prisma.place.findFirst({ where: { id: body.data.placeId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { placeId: place.id },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "placed",
    entityType: "place",
    entityId: place.id,
    title: updated.title || place.name,
  });
  return NextResponse.json({
    asset: updated,
    heading: chroniclePhotosHeading(place.name, 1),
  });
}
