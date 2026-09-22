import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWeatherHeading } from "@/lib/weatherNote";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [photos, letters] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, capturedAt: { not: null }, OR: [{ weather: null }, { weather: "" }] },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, writtenAt: { not: null }, OR: [{ weather: null }, { weather: "" }] },
    }),
  ]);
  const items = [
    ...photos.map((photo) => ({ id: photo.id, title: photo.title || "Untitled photograph", kind: "photo" })),
    ...letters.map((letter) => ({ id: letter.id, title: letter.title, kind: "letter" })),
  ];
  return NextResponse.json({ heading: missingWeatherHeading(items.length), items });
}
