import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { replaceChunks } from "@/lib/chunk";

const editSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const story = await prisma.story.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: { include: { document: true, asset: true } },
    },
  });
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  return NextResponse.json({ story });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = editSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A story needs words to keep." }, { status: 400 });
  const existing = await prisma.story.findFirst({ where: { id, familyId: ctx.family.id } });
  if (!existing) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const title = body.data.title?.trim() || existing.title;
  const text = body.data.body?.trim() || existing.body;
  const story = await prisma.story.update({
    where: { id: existing.id },
    data: { title, body: text },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: { include: { document: true, asset: true } },
    },
  });
  if (existing.documentId) {
    await prisma.document.update({
      where: { id: existing.documentId },
      data: { title, transcript: text },
    });
    await replaceChunks({
      familyId: ctx.family.id,
      documentId: existing.documentId,
      personId: existing.tellerPersonId,
      transcript: text,
    });
  }
  return NextResponse.json({ story });
}
