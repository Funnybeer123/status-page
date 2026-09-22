import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { askStoriesHeading } from "@/lib/askStory";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const conversations = await prisma.askConversation.findMany({
    where: { familyId: ctx.family.id, storyId: { not: null } },
    include: { story: { include: { citations: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    conversations,
    heading: askStoriesHeading(conversations.length),
  });
}
