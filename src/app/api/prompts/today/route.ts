import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { pickTodayQuestion, todayQuestionHeading } from "@/lib/todayQuestion";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: { answers: true },
    orderBy: { createdAt: "asc" },
  });
  const prompt = pickTodayQuestion(prompts);
  return NextResponse.json({
    prompt,
    heading: todayQuestionHeading(prompt?.title),
  });
}
