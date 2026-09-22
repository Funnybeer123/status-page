import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { NextResponse } from "next/server";
import { AssetKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { createStoryRecord } from "@/lib/stories";
import { saveUpload } from "@/lib/media";

const schema = z.object({
  promptId: z.string(),
  body: z.string().max(8000).optional(),
  personId: z.string().optional(),
});

async function readAnswer(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    return {
      promptId: String(form.get("promptId") || ""),
      body: String(form.get("body") || ""),
      personId: String(form.get("personId") || "") || undefined,
      file: file instanceof File && file.size ? file : null,
    };
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return null;
  return { ...parsed.data, file: null as File | null };
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const input = await readAnswer(req);
  if (!input?.promptId) return NextResponse.json({ error: "Answer in your own words." }, { status: 400 });
  const spokenOnly = Boolean(input.file) && !input.body?.trim();
  const body = input.body?.trim() || (spokenOnly ? "(spoken answer)" : "");
  if (!body) return NextResponse.json({ error: "Answer in your own words." }, { status: 400 });
  const prompt = await prisma.storyPrompt.findFirst({
    where: { id: input.promptId, familyId: ctx.family.id },
  });
  if (!prompt) return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  let assetId: string | null = null;
  if (input.file) {
    const bytes = Buffer.from(await input.file.arrayBuffer());
    const ext = extname(input.file.name) || ".wav";
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    const storagePath = await saveUpload(ctx.family.id, filename, bytes);
    const asset = await prisma.asset.create({
      data: {
        familyId: ctx.family.id,
        kind: AssetKind.audio,
        title: `${prompt.title} (spoken)`,
        mimeType: input.file.type || "audio/wav",
        storagePath,
        uploadedById: ctx.session.user.id,
      },
    });
    assetId = asset.id;
  }
  const teller = input.personId || ctx.membership.personId || null;
  const story = await createStoryRecord({
    familyId: ctx.family.id,
    title: prompt.title,
    body,
    recordedAt: new Date(),
    tellerPersonId: teller,
    personIds: teller ? [teller] : [],
  });
  const answer = await prisma.storyPromptAnswer.create({
    data: {
      promptId: prompt.id,
      storyId: story.id,
      authorId: ctx.session.user.id,
      assetId,
    },
    include: { story: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "answered",
    entityType: "story",
    entityId: story.id,
    title: prompt.title,
    summary: assetId ? "spoken story prompt" : "story prompt",
  });
  return NextResponse.json({ answer, story });
}
