import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { keepOutBadge, keepOutLine } from "@/lib/keepOut";

const schema = z.object({
  kind: z.enum(["story", "letter", "journal"]),
  id: z.string(),
  keepOut: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [stories, letters, journals] = await Promise.all([
    prisma.story.findMany({
      where: { familyId: ctx.family.id, keepOutOfAsk: true },
      select: { id: true, title: true },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, keepOutOfAsk: true, kind: { in: ["letter", "note", "clipping"] }, deletedAt: null },
      select: { id: true, title: true, kind: true },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: ctx.session.user.id, keepOutOfAsk: true },
      select: { id: true, title: true },
    }),
  ]);
  return NextResponse.json({ stories, letters, journals });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a story, letter, or journal." }, { status: 400 });
  const keepOut = body.data.keepOut;

  if (body.data.kind === "journal") {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: body.data.id, familyId: ctx.family.id, authorId: ctx.session.user.id },
    });
    if (!entry) return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
    const updated = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: { keepOutOfAsk: keepOut },
    });
    if (updated.storyId) {
      const story = await prisma.story.findFirst({ where: { id: updated.storyId, familyId: ctx.family.id } });
      if (story) {
        await prisma.story.update({ where: { id: story.id }, data: { keepOutOfAsk: keepOut } });
        if (story.documentId) {
          await prisma.document.update({ where: { id: story.documentId }, data: { keepOutOfAsk: keepOut } });
        }
      }
    }
    return NextResponse.json({
      entry: updated,
      keepOut,
      heading: keepOutLine(updated.title, keepOut),
      badge: keepOutBadge(keepOut),
    });
  }

  if (ctx.role === Role.viewer) {
    return NextResponse.json({ error: "A viewer cannot keep a story or letter out of Ask." }, { status: 403 });
  }

  if (body.data.kind === "story") {
    const story = await prisma.story.findFirst({ where: { id: body.data.id, familyId: ctx.family.id } });
    if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
    const updated = await prisma.story.update({
      where: { id: story.id },
      data: { keepOutOfAsk: keepOut },
    });
    if (updated.documentId) {
      await prisma.document.update({ where: { id: updated.documentId }, data: { keepOutOfAsk: keepOut } });
    }
    return NextResponse.json({
      story: updated,
      keepOut,
      heading: keepOutLine(updated.title, keepOut),
      badge: keepOutBadge(keepOut),
    });
  }

  const letter = await prisma.document.findFirst({
    where: { id: body.data.id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const updated = await prisma.document.update({
    where: { id: letter.id },
    data: { keepOutOfAsk: keepOut },
  });
  if (updated.kind === "story") {
    await prisma.story.updateMany({
      where: { documentId: updated.id, familyId: ctx.family.id },
      data: { keepOutOfAsk: keepOut },
    });
  }
  return NextResponse.json({
    letter: updated,
    keepOut,
    heading: keepOutLine(updated.title, keepOut),
    badge: keepOutBadge(keepOut),
  });
}
