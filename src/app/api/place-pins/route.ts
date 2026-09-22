import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placePinLine, placePinsHeading, pinHref } from "@/lib/placePin";

const schema = z.object({
  placeId: z.string(),
  title: z.string().min(1).max(200),
  documentId: z.string().optional(),
  storyId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const pins = await prisma.placePin.findMany({
    where: { familyId: ctx.family.id },
    include: { place: true, document: true, story: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    pins: pins.map((pin) => ({
      ...pin,
      line: placePinLine(pin.title, pin.place.name),
      href: pinHref(pin),
    })),
    heading: placePinsHeading(pins.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pin a letter or a story to a place." }, { status: 400 });
  if (!body.data.documentId && !body.data.storyId) {
    return NextResponse.json({ error: "Choose a letter or a story to pin." }, { status: 400 });
  }
  const place = await prisma.place.findFirst({
    where: { id: body.data.placeId, familyId: ctx.family.id },
  });
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  if (body.data.documentId) {
    const document = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!document) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  }
  if (body.data.storyId) {
    const story = await prisma.story.findFirst({
      where: { id: body.data.storyId, familyId: ctx.family.id },
    });
    if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }
  const pin = await prisma.placePin.create({
    data: {
      familyId: ctx.family.id,
      placeId: place.id,
      title: body.data.title.trim(),
      documentId: body.data.documentId || null,
      storyId: body.data.storyId || null,
    },
    include: { place: true, document: true, story: true },
  });
  return NextResponse.json({
    pin,
    line: placePinLine(pin.title, place.name),
    heading: placePinsHeading(1),
  });
}
