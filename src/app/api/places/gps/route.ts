import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseGps, placeGpsHeading } from "@/lib/placeGps";

const schema = z.object({
  placeId: z.string(),
  gps: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A place needs a GPS field." }, { status: 400 });
  const place = await prisma.place.findFirst({
    where: { id: body.data.placeId, familyId: ctx.family.id },
  });
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  const parsed = parseGps(body.data.gps);
  const updated = await prisma.place.update({
    where: { id: place.id },
    data: {
      gps: body.data.gps.trim(),
      latitude: parsed?.latitude ?? place.latitude,
      longitude: parsed?.longitude ?? place.longitude,
    },
  });
  return NextResponse.json({
    place: updated,
    heading: placeGpsHeading(updated.name),
    point: parsed,
  });
}
