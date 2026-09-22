import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: { answers: { include: { story: true, author: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ prompts });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A prompt needs a question." }, { status: 400 });
  const prompt = await prisma.storyPrompt.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      body: body.data.body?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "asked",
    entityType: "prompt",
    entityId: prompt.id,
    title: prompt.title,
    summary: "story prompt",
  });
  return NextResponse.json({ prompt });
}
