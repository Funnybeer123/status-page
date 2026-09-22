import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileReadLater, readLaterHeading, readLaterLine } from "@/lib/readLater";

const schema = z.object({
  documentId: z.string().optional(),
  storyId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.readLater.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    include: { document: true, story: true },
  });
  const items = compileReadLater(rows);
  return NextResponse.json({ heading: readLaterHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success || (!body.data.documentId && !body.data.storyId)) {
    return NextResponse.json({ error: "Choose a letter or a story to read later." }, { status: 400 });
  }
  if (body.data.documentId) {
    const document = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!document) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
    const existing = await prisma.readLater.findFirst({
      where: { familyId: ctx.family.id, userId: ctx.session.user.id, documentId: document.id },
    });
    const row =
      existing ||
      (await prisma.readLater.create({
        data: {
          familyId: ctx.family.id,
          userId: ctx.session.user.id,
          documentId: document.id,
        },
        include: { document: true },
      }));
    return NextResponse.json({ item: row, line: readLaterLine(document.title, "letter") });
  }
  const story = await prisma.story.findFirst({
    where: { id: body.data.storyId, familyId: ctx.family.id },
  });
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const existing = await prisma.readLater.findFirst({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id, storyId: story.id },
  });
  const row =
    existing ||
    (await prisma.readLater.create({
      data: {
        familyId: ctx.family.id,
        userId: ctx.session.user.id,
        storyId: story.id,
      },
      include: { story: true },
    }));
  return NextResponse.json({ item: row, line: readLaterLine(story.title, "story") });
}
