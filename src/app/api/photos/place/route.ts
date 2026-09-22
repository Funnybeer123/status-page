import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlace } from "@/lib/places";

const schema = z.object({
  assetId: z.string(),
  placeId: z.string().optional(),
  name: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a photograph and a place." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  const place = await findOrCreatePlace({
    familyId: ctx.family.id,
    placeId: body.data.placeId,
    name: body.data.name,
    locality: body.data.locality,
    region: body.data.region,
    country: body.data.country,
  });
  if (!place) return NextResponse.json({ error: "A place needs a name." }, { status: 400 });
  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { placeId: place.id },
    include: { place: true },
  });
  return NextResponse.json({ asset: updated, place });
}
