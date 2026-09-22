import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clueCitationLine, compileHuntClue, huntHeading } from "@/lib/hunt";

const schema = z.object({
  huntId: z.string(),
  clue: z.string().min(1).max(800),
  targetKind: z.enum(["letter", "photo", "place"]),
  answer: z.string().min(1).max(400),
  citation: z.string().max(400).optional(),
  documentId: z.string().optional(),
  assetId: z.string().optional(),
  placeId: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A clue needs the hint, the kind, and the answer." }, { status: 400 });
  const hunt = await prisma.hunt.findFirst({
    where: { id: body.data.huntId, familyId: ctx.family.id },
    include: { clues: true },
  });
  if (!hunt) return NextResponse.json({ error: "Hunt not found." }, { status: 404 });
  if (body.data.documentId) {
    const document = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!document) return NextResponse.json({ error: "That letter is not in this archive." }, { status: 404 });
  }
  if (body.data.assetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!asset) return NextResponse.json({ error: "That photograph is not in this archive." }, { status: 404 });
  }
  if (body.data.placeId) {
    const place = await prisma.place.findFirst({
      where: { id: body.data.placeId, familyId: ctx.family.id },
    });
    if (!place) return NextResponse.json({ error: "That place is not in this archive." }, { status: 404 });
  }
  const created = await prisma.huntClue.create({
    data: {
      familyId: ctx.family.id,
      huntId: hunt.id,
      clue: body.data.clue.trim(),
      targetKind: body.data.targetKind,
      answer: body.data.answer.trim(),
      citation: body.data.citation?.trim() || null,
      documentId: body.data.documentId || null,
      assetId: body.data.assetId || null,
      placeId: body.data.placeId || null,
      sortOrder: hunt.clues.length,
    },
    include: { document: true, asset: true, place: true },
  });
  return NextResponse.json({
    clue: created,
    compiled: compileHuntClue({
      id: created.id,
      clue: created.clue,
      targetKind: created.targetKind,
      answer: created.answer,
      citation: created.citation,
      documentTitle: created.document?.title,
      assetTitle: created.asset?.title,
      placeName: created.place?.name,
    }),
    citation: clueCitationLine({
      clue: created.clue,
      targetKind: created.targetKind,
      answer: created.answer,
      citation: created.citation,
      documentTitle: created.document?.title,
      assetTitle: created.asset?.title,
      placeName: created.place?.name,
    }),
    heading: huntHeading(hunt.title, hunt.clues.length + 1),
  });
}
