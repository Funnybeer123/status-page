import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { createStoryRecord } from "@/lib/stories";
import { ELDER_QUESTIONS, interviewQuestion } from "@/lib/interviews";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  personId: z.string(),
  promptKey: z.string(),
  body: z.string().min(1).max(8000),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const answers = await prisma.interviewAnswer.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, story: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ questions: ELDER_QUESTIONS, answers });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Answer a question in the relative’s own words." }, { status: 400 });
  const question = interviewQuestion(body.data.promptKey);
  if (!question) return NextResponse.json({ error: "That interview question is not on the list." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const existing = await prisma.interviewAnswer.findFirst({
    where: { personId: person.id, promptKey: question.key },
  });
  if (existing) return NextResponse.json({ error: "That question already has an answer for this relative." }, { status: 400 });
  const story = await createStoryRecord({
    familyId: ctx.family.id,
    title: `${person.displayName} on “${question.question}”`,
    body: body.data.body.trim(),
    recordedAt: new Date(),
    tellerPersonId: person.id,
    personIds: [person.id],
  });
  const answer = await prisma.interviewAnswer.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      promptKey: question.key,
      question: question.question,
      storyId: story.id,
    },
    include: { person: true, story: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "interview",
    entityId: story.id,
    title: answer.question,
    summary: person.displayName,
  });
  return NextResponse.json({ answer, story });
}
