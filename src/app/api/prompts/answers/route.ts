import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  promptId: z.string(),
  body: z.string().min(1).max(8000),
  personId: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Answer in your own words." }, { status: 400 });
  const prompt = await prisma.storyPrompt.findFirst({
    where: { id: body.data.promptId, familyId: ctx.family.id },
  });
  if (!prompt) return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  const story = await prisma.story.create({
    data: {
      familyId: ctx.family.id,
      title: prompt.title,
      body: body.data.body.trim(),
      recordedAt: new Date(),
      tellerPersonId: body.data.personId || ctx.membership.personId || null,
      people: body.data.personId || ctx.membership.personId
        ? { create: { personId: body.data.personId || ctx.membership.personId! } }
        : undefined,
    },
  });
  const answer = await prisma.storyPromptAnswer.create({
    data: {
      promptId: prompt.id,
      storyId: story.id,
      authorId: ctx.session.user.id,
    },
    include: { story: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "answered",
    entityType: "story",
    entityId: story.id,
    title: prompt.title,
    summary: "story prompt",
  });
  return NextResponse.json({ answer, story });
}
