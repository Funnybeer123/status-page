import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity, activityHref } from "@/lib/activity";
import { notifyMentions } from "@/lib/mentions";

const schema = z.object({
  body: z.string().min(1).max(4000),
  assetId: z.string().optional(),
  documentId: z.string().optional(),
  storyId: z.string().optional(),
  personId: z.string().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const comments = await prisma.comment.findMany({
    where: {
      familyId: ctx.family.id,
      ...(url.searchParams.get("assetId") ? { assetId: url.searchParams.get("assetId") } : {}),
      ...(url.searchParams.get("documentId") ? { documentId: url.searchParams.get("documentId") } : {}),
      ...(url.searchParams.get("storyId") ? { storyId: url.searchParams.get("storyId") } : {}),
      ...(url.searchParams.get("personId") ? { personId: url.searchParams.get("personId") } : {}),
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
  if (!body.data.assetId && !body.data.documentId && !body.data.storyId && !body.data.personId) {
    return NextResponse.json({ error: "A comment needs a photo, letter, story, or memorial." }, { status: 400 });
  }
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const comment = await prisma.comment.create({
    data: {
      familyId: ctx.family.id,
      authorId: ctx.session.user.id,
      body: body.data.body.trim(),
      assetId: body.data.assetId,
      documentId: body.data.documentId,
      storyId: body.data.storyId,
      personId: body.data.personId,
    },
    include: { author: { select: { id: true, name: true } } },
  });
  const entityType = body.data.personId ? "guestbook" : body.data.storyId ? "story" : body.data.documentId ? "document" : "asset";
  const entityId = body.data.personId || body.data.storyId || body.data.documentId || body.data.assetId;
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "commented",
    entityType,
    entityId,
    title: "Left a note",
    summary: comment.body.slice(0, 160),
  });
  await notifyMentions({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    body: comment.body,
    href: activityHref(entityType, entityId),
  });
  return NextResponse.json({ comment });
}
