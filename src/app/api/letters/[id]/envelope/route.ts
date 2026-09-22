import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { envelopeHeading, envelopeLine, hasEnvelope } from "@/lib/envelope";

const schema = z.object({
  envelopeFrom: z.string().max(200).optional().nullable(),
  envelopeTo: z.string().max(200).optional().nullable(),
  envelopeAssetId: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { envelopeAsset: true },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  return NextResponse.json({
    heading: envelopeHeading(letter.title),
    line: envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt),
    hasEnvelope: hasEnvelope(letter),
    letter,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An envelope needs a sender or addressee." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  if (body.data.envelopeAssetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: body.data.envelopeAssetId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!asset) return NextResponse.json({ error: "Envelope scan not found." }, { status: 404 });
  }
  const letter = await prisma.document.update({
    where: { id },
    data: {
      envelopeFrom: body.data.envelopeFrom === undefined ? existing.envelopeFrom : body.data.envelopeFrom?.trim() || null,
      envelopeTo: body.data.envelopeTo === undefined ? existing.envelopeTo : body.data.envelopeTo?.trim() || null,
      envelopeAssetId:
        body.data.envelopeAssetId === undefined ? existing.envelopeAssetId : body.data.envelopeAssetId || null,
    },
    include: { envelopeAsset: true },
  });
  return NextResponse.json({
    heading: envelopeHeading(letter.title),
    line: envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt),
    hasEnvelope: hasEnvelope(letter),
    letter,
  });
}
