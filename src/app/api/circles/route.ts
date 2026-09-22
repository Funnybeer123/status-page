import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMissingCircles, compileOneVoicePrompts, compileStoryCircles, storyCirclesHeading } from "@/lib/storyCircles";

function toPrompt(prompt: {
  id: string;
  title: string;
  body: string | null;
  answers: { id: string; story: { id: string; title: string; body: string; teller: { displayName: string } | null }; author: { name: string } }[];
}) {
  return {
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    answers: prompt.answers.map((answer) => ({
      id: answer.id,
      teller: answer.story.teller?.displayName || answer.author.name,
      body: answer.story.body,
      href: `/stories/${answer.story.id}`,
    })),
  };
}

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: {
      answers: { include: { story: { include: { teller: true } }, author: { select: { name: true } } } },
    },
  });
  const mapped = prompts.map(toPrompt);
  const circles = compileStoryCircles(mapped);
  return NextResponse.json({
    circles,
    heading: storyCirclesHeading(circles.length),
    missing: compileMissingCircles(mapped),
    oneVoice: compileOneVoicePrompts(mapped),
  });
}
