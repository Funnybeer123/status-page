import { prisma } from "@/lib/prisma";
import { answerQuestion, type AskResult, type AskSource, type AskTurnInput } from "@/lib/ask";

export async function loadConversation(familyId: string, userId: string, conversationId: string) {
  return prisma.askConversation.findFirst({
    where: { id: conversationId, familyId, userId },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
}

export function turnsToPrior(turns: { role: string; text: string }[]): AskTurnInput[] {
  return turns
    .filter((turn) => turn.role === "user" || turn.role === "assistant")
    .map((turn) => ({ role: turn.role as "user" | "assistant", text: turn.text }));
}

export function parseSources(value?: string | null): AskSource[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as AskSource[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function askAndRemember(input: {
  familyId: string;
  userId: string;
  question: string;
  conversationId?: string | null;
}): Promise<AskResult & { conversationId: string }> {
  let conversation = input.conversationId
    ? await loadConversation(input.familyId, input.userId, input.conversationId)
    : null;
  if (!conversation) {
    conversation = await prisma.askConversation.create({
      data: {
        familyId: input.familyId,
        userId: input.userId,
        title: input.question.trim().slice(0, 160),
      },
      include: { turns: { orderBy: { createdAt: "asc" } } },
    });
  }
  const prior = turnsToPrior(conversation.turns);
  const result = await answerQuestion(input.familyId, input.question, prior);
  await prisma.askTurn.create({
    data: { conversationId: conversation.id, role: "user", text: input.question.trim() },
  });
  await prisma.askTurn.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      text: result.answer,
      sourcesJson: JSON.stringify(result.sources),
    },
  });
  await prisma.askConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });
  return { ...result, conversationId: conversation.id };
}
