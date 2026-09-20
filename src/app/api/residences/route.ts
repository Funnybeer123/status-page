import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/parse";
import { findOrCreatePlace } from "@/lib/places";
import { recordResidenceEvent } from "@/lib/events";
import { hideResidenceForViewer } from "@/lib/privacy";

const schema = z.object({
  personId: z.string(),
  placeId: z.string().optional(),
  name: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const residences = await prisma.residence.findMany({
    where: { familyId: ctx.family.id, ...(personId ? { personId } : {}) },
    include: { person: true, place: true, citations: true },
    orderBy: { startedAt: "asc" },
  });
  return NextResponse.json({
    residences: residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A person and place are required." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const place = await findOrCreatePlace({
    familyId: ctx.family.id,
    placeId: body.data.placeId,
    name: body.data.name,
    locality: body.data.locality,
    region: body.data.region,
    country: body.data.country,
  });
  if (!place) return NextResponse.json({ error: "Name the place they lived." }, { status: 400 });
  const residence = await prisma.residence.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      placeId: place.id,
      startedAt: parseDate(body.data.startedAt),
      endedAt: parseDate(body.data.endedAt),
      notes: body.data.notes?.trim() || null,
    },
    include: { place: true, person: true },
  });
  await recordResidenceEvent({
    familyId: ctx.family.id,
    personId: person.id,
    placeName: place.name,
    startedAt: residence.startedAt,
    endedAt: residence.endedAt,
    placeId: place.id,
  });
  return NextResponse.json({ residence });
}
