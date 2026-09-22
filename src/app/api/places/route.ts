import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlace, placeLabel } from "@/lib/places";

const schema = z.object({
  name: z.string().min(1).max(160),
  locality: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { _count: { select: { residences: true, events: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    places: places.map((place) => ({ ...place, label: placeLabel(place) })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A place name is required." }, { status: 400 });
  const place = await findOrCreatePlace({
    familyId: ctx.family.id,
    name: body.data.name,
    locality: body.data.locality,
    region: body.data.region,
    country: body.data.country,
    latitude: body.data.latitude,
    longitude: body.data.longitude,
  });
  return NextResponse.json({ place });
}
