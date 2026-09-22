import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const createSchema = z.object({
  title: z.string().min(1).max(160),
  line: z.string().max(200).optional(),
  locality: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  placeId: z.string().optional(),
  notes: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

const addSchema = z.object({
  homeId: z.string(),
  assetId: z.string().optional(),
  personId: z.string().optional(),
  takenOn: z.string().optional(),
  caption: z.string().max(200).optional(),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const homes = await prisma.familyHome.findMany({
    where: { familyId: ctx.family.id },
    include: { photos: { include: { asset: true } }, residents: { include: { person: true } }, place: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ homes });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const raw = await req.json().catch(() => null);
  const add = addSchema.safeParse(raw);
  if (add.success && add.data.homeId && (add.data.assetId || add.data.personId)) {
    const home = await prisma.familyHome.findFirst({ where: { id: add.data.homeId, familyId: ctx.family.id } });
    if (!home) return NextResponse.json({ error: "House not found." }, { status: 404 });
    if (add.data.assetId) {
      const asset = await prisma.asset.findFirst({ where: { id: add.data.assetId, familyId: ctx.family.id, deletedAt: null } });
      if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
      const photo = await prisma.familyHomePhoto.create({
        data: {
          homeId: home.id,
          assetId: asset.id,
          takenOn: add.data.takenOn ? new Date(add.data.takenOn) : asset.capturedAt,
          caption: add.data.caption?.trim() || null,
        },
        include: { asset: true },
      });
      return NextResponse.json({ photo });
    }
    const person = await prisma.person.findFirst({ where: { id: add.data.personId, familyId: ctx.family.id, deletedAt: null } });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const resident = await prisma.familyHomeResident.upsert({
      where: { homeId_personId: { homeId: home.id, personId: person.id } },
      create: {
        homeId: home.id,
        personId: person.id,
        startedOn: add.data.startedOn ? new Date(add.data.startedOn) : null,
        endedOn: add.data.endedOn ? new Date(add.data.endedOn) : null,
      },
      update: {
        startedOn: add.data.startedOn ? new Date(add.data.startedOn) : undefined,
        endedOn: add.data.endedOn ? new Date(add.data.endedOn) : undefined,
      },
      include: { person: true },
    });
    return NextResponse.json({ resident });
  }
  const body = createSchema.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: "A house needs a name." }, { status: 400 });
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [...new Set(body.data.personIds ?? [])] }, deletedAt: null },
  });
  const home = await prisma.familyHome.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      line: body.data.line?.trim() || null,
      locality: body.data.locality?.trim() || null,
      region: body.data.region?.trim() || null,
      placeId: body.data.placeId || null,
      notes: body.data.notes?.trim() || null,
      residents: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { photos: { include: { asset: true } }, residents: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "home",
    entityId: home.id,
    title: home.title,
  });
  return NextResponse.json({ home });
}
