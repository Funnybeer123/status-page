import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unansweredQuestionsHeading } from "@/lib/todayQuestion";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id, answers: { none: {} } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ prompts, heading: unansweredQuestionsHeading(prompts.length) });
}
