import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { recordActivity } from "@/lib/activity";
import { notifyFollowers } from "@/lib/follows";
import { saveAskAnswerAsStory } from "@/lib/askStory";

const schema = z.object({
  conversationId: z.string(),
  title: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose an Ask conversation to save as a story." }, { status: 400 });
  const result = await saveAskAnswerAsStory({
    familyId: ctx.family.id,
    userId: ctx.session.user.id,
    conversationId: body.data.conversationId,
    title: body.data.title,
    body: body.data.body,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!result.reused) {
    const personIds =
      "people" in result.story && Array.isArray(result.story.people)
        ? result.story.people.map((row: { personId: string }) => row.personId)
        : [];
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "wrote",
      entityType: "story",
      entityId: result.story.id,
      title: result.story.title,
      summary: "An Ask answer was saved as a family story.",
    });
    await notifyFollowers({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      personIds,
      kind: "story",
      title: result.story.title,
      entityId: result.story.id,
    });
  }
  return NextResponse.json({ story: result.story, heading: result.heading, reused: result.reused });
}
