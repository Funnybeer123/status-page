import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { askAndRemember, loadConversation, parseSources } from "@/lib/askConversations";

const schema = z.object({
  question: z.string().min(1).max(500),
  conversationId: z.string().optional(),
  bilingual: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (conversationId) {
    const conversation = await loadConversation(ctx.family.id, ctx.session.user.id, conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        saved: conversation.saved,
        turns: conversation.turns.map((turn) => ({
          role: turn.role,
          text: turn.text,
          sources: parseSources(turn.sourcesJson),
        })),
      },
    });
  }
  const conversations = await prisma.askConversation.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  const result = await askAndRemember({
    familyId: ctx.family.id,
    userId: ctx.session.user.id,
    question: body.data.question,
    conversationId: body.data.conversationId,
    bilingual: body.data.bilingual,
  });
  return NextResponse.json(result);
}
