import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { weatherNoteLine, weatherNotesHeading } from "@/lib/weatherNote";

const schema = z.object({
  assetId: z.string().optional(),
  documentId: z.string().optional(),
  weather: z.string().min(1).max(240),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [photos, letters] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, weather: { not: null } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, weather: { not: null } },
      orderBy: { writtenAt: "asc" },
    }),
  ]);
  const items = [
    ...photos.map((photo) => ({
      id: photo.id,
      title: photo.title || "Untitled photograph",
      kind: "photo",
      line: weatherNoteLine(photo.weather, photo.capturedAt),
      href: `/archive/${photo.id}`,
    })),
    ...letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      kind: "letter",
      line: weatherNoteLine(letter.weather, letter.writtenAt),
      href: `/letters/${letter.id}`,
    })),
  ];
  return NextResponse.json({ heading: weatherNotesHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A weather note needs a few words." }, { status: 400 });
  const weather = body.data.weather.trim();
  if (body.data.assetId) {
    const existing = await prisma.asset.findFirst({
      where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
    const asset = await prisma.asset.update({ where: { id: existing.id }, data: { weather } });
    return NextResponse.json({ asset, line: weatherNoteLine(asset.weather, asset.capturedAt) });
  }
  if (body.data.documentId) {
    const existing = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
    const document = await prisma.document.update({ where: { id: existing.id }, data: { weather } });
    return NextResponse.json({ document, line: weatherNoteLine(document.weather, document.writtenAt) });
  }
  return NextResponse.json({ error: "Choose a photograph or a letter." }, { status: 400 });
}
