import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { replaceChunks } from "@/lib/chunk";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  assetId: z.string(),
  transcript: z.string().min(1).max(20000),
  title: z.string().max(160).optional(),
  personId: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write what you heard on the recording." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
    include: { document: true, tags: true },
  });
  if (!asset) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  const title = body.data.title?.trim() || asset.title || "Oral history transcript";
  const personId = body.data.personId || asset.tags[0]?.personId || null;
  const document = asset.document
    ? await prisma.document.update({
        where: { id: asset.document.id },
        data: { transcript: body.data.transcript.trim(), title, needsReview: false },
      })
    : await prisma.document.create({
        data: {
          familyId: ctx.family.id,
          assetId: asset.id,
          title,
          kind: DocKind.note,
          transcript: body.data.transcript.trim(),
          writtenAt: asset.capturedAt,
          people: personId ? { create: [{ personId }] } : undefined,
        },
      });
  await replaceChunks({
    familyId: ctx.family.id,
    documentId: document.id,
    personId,
    transcript: document.transcript,
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "transcribed",
    entityType: "document",
    entityId: document.id,
    title,
  });
  return NextResponse.json({ document });
}
