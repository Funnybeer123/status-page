import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { createStoryRecord } from "@/lib/stories";
import { journalHeading, journalLine, journalSharedHeading } from "@/lib/journal";

const schema = z.object({
  id: z.string().optional(),
  share: z.boolean().optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(8000).optional(),
  recordedAt: z.string().optional(),
  keepOut: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const sharedOnly = new URL(req.url).searchParams.get("shared") === "1";
  const entries = await prisma.journalEntry.findMany({
    where: {
      familyId: ctx.family.id,
      authorId: ctx.session.user.id,
      ...(sharedOnly ? { storyId: { not: null } } : {}),
    },
    include: { story: true },
    orderBy: { createdAt: "desc" },
  });
  const shared = entries.filter((entry) => entry.storyId).length;
  return NextResponse.json({
    entries,
    heading: sharedOnly ? journalSharedHeading(shared) : journalHeading(entries.length, shared),
    lines: entries.map((entry) => journalLine(entry.title, Boolean(entry.storyId))),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A journal entry needs a title and some words." }, { status: 400 });

  if (body.data.id && body.data.share) {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: body.data.id, familyId: ctx.family.id, authorId: ctx.session.user.id },
    });
    if (!existing) return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
    if (existing.storyId) {
      const story = await prisma.story.findFirst({ where: { id: existing.storyId, familyId: ctx.family.id } });
      return NextResponse.json({ entry: { ...existing, story }, story });
    }
    const story = await createStoryRecord({
      familyId: ctx.family.id,
      title: existing.title,
      body: existing.body,
      recordedAt: existing.recordedAt,
      keepOutOfAsk: existing.keepOutOfAsk,
    });
    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: { storyId: story.id },
      include: { story: true },
    });
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "shared",
      entityType: "journal",
      entityId: entry.id,
      title: journalLine(entry.title, true),
    });
    return NextResponse.json({ entry, story });
  }

  if (!body.data.title?.trim() || !body.data.body?.trim()) {
    return NextResponse.json({ error: "A journal entry needs a title and some words." }, { status: 400 });
  }
  const entry = await prisma.journalEntry.create({
    data: {
      familyId: ctx.family.id,
      authorId: ctx.session.user.id,
      title: body.data.title.trim(),
      body: body.data.body.trim(),
      recordedAt: body.data.recordedAt ? new Date(body.data.recordedAt) : null,
      keepOutOfAsk: Boolean(body.data.keepOut),
    },
  });
  return NextResponse.json({ entry, heading: journalLine(entry.title, false) });
}
