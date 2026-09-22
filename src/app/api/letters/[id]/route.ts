import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { replaceChunks } from "@/lib/chunk";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  transcript: z.string().optional(),
  writtenAt: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid letter." }, { status: 400 });
  const existing = await prisma.document.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  if (body.data.transcript !== undefined && body.data.transcript !== existing.transcript) {
    await prisma.documentRevision.create({
      data: {
        documentId: existing.id,
        transcript: existing.transcript,
        editedById: ctx.session.user.id,
      },
    });
  }
  const document = await prisma.document.update({
    where: { id },
    data: {
      title: body.data.title ?? existing.title,
      transcript: body.data.transcript ?? existing.transcript,
      writtenAt:
        body.data.writtenAt === undefined
          ? existing.writtenAt
          : body.data.writtenAt
            ? new Date(body.data.writtenAt)
            : null,
    },
  });
  if (body.data.transcript !== undefined) {
    await replaceChunks({
      familyId: ctx.family.id,
      documentId: document.id,
      transcript: document.transcript,
    });
  }
  return NextResponse.json({ document });
}
