import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { replaceChunks } from "@/lib/chunk";
import { isTranscriptLocked, lockConflictMessage, transcriptCreditLine, transcriptLockHeading } from "@/lib/transcriptLock";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  transcript: z.string().optional(),
  translation: z.string().optional().nullable(),
  writtenAt: z.string().optional().nullable(),
  needsReview: z.boolean().optional(),
  replyToId: z.string().optional().nullable(),
  lock: z.boolean().optional(),
  fragileOriginal: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid letter." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { transcribedBy: { select: { name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const transcriptChanged = body.data.transcript !== undefined && body.data.transcript !== existing.transcript;
  if (isTranscriptLocked(existing) && transcriptChanged) {
    return NextResponse.json({ error: lockConflictMessage() }, { status: 409 });
  }
  if (transcriptChanged) {
    await prisma.documentRevision.create({
      data: {
        documentId: existing.id,
        transcript: existing.transcript,
        editedById: ctx.session.user.id,
      },
    });
  }
  const lock = body.data.lock;
  const document = await prisma.document.update({
    where: { id },
    data: {
      title: body.data.title ?? existing.title,
      transcript: body.data.transcript ?? existing.transcript,
      translation: body.data.translation === undefined ? existing.translation : body.data.translation || null,
      needsReview: body.data.needsReview ?? existing.needsReview,
      replyToId: body.data.replyToId === undefined ? existing.replyToId : body.data.replyToId || null,
      writtenAt:
        body.data.writtenAt === undefined
          ? existing.writtenAt
          : body.data.writtenAt
            ? new Date(body.data.writtenAt)
            : null,
      transcribedById:
        transcriptChanged || lock === true ? ctx.session.user.id : existing.transcribedById,
      transcriptLockedAt:
        lock === true ? new Date() : lock === false ? null : existing.transcriptLockedAt,
      fragileOriginal: body.data.fragileOriginal ?? existing.fragileOriginal,
    },
    include: { transcribedBy: { select: { name: true } } },
  });
  if (body.data.transcript !== undefined || body.data.translation !== undefined) {
    await replaceChunks({
      familyId: ctx.family.id,
      documentId: document.id,
      transcript: [document.transcript, document.translation].filter(Boolean).join("\n\n"),
    });
  }
  return NextResponse.json({
    document,
    credit: transcriptCreditLine(document.transcribedBy?.name),
    lockHeading: transcriptLockHeading(isTranscriptLocked(document)),
  });
}
