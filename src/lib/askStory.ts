import { prisma } from "@/lib/prisma";
import { createStoryRecord } from "@/lib/stories";
import { parseSources } from "@/lib/askConversations";
import type { AskSource } from "@/lib/ask";

export function askStoryHeading() {
  return "Saved as a family story";
}

export function askStorySavedLine(title: string) {
  return `Saved as a family story · ${title.trim() || "Ask answer"}`;
}

export function askStoriesHeading(count: number) {
  if (!count) return "No Ask answers saved as stories yet";
  if (count === 1) return "1 Ask answer saved as a story";
  return `${count} Ask answers saved as stories`;
}

export function askCitationLine(title: string) {
  return title.trim() || "A cited letter";
}

export async function saveAskAnswerAsStory(input: {
  familyId: string;
  userId: string;
  conversationId: string;
  title?: string;
  body?: string;
}) {
  const conversation = await prisma.askConversation.findFirst({
    where: { id: input.conversationId, familyId: input.familyId, userId: input.userId },
    include: { turns: { orderBy: { createdAt: "asc" } }, story: { include: { citations: true } } },
  });
  if (!conversation) return { error: "Conversation not found.", status: 404 as const };
  if (conversation.storyId && conversation.story) {
    return { story: conversation.story, heading: askStorySavedLine(conversation.story.title), reused: true };
  }
  const lastAssistant = [...conversation.turns].reverse().find((turn) => turn.role === "assistant");
  if (!lastAssistant) return { error: "Ask a question first, then save the answer as a story.", status: 400 as const };
  const sources = parseSources(lastAssistant.sourcesJson);
  const documentIds = sources.filter((source) => source.kind !== "photo").map((source) => source.documentId);
  const people = documentIds.length
    ? await prisma.documentPerson.findMany({ where: { documentId: { in: documentIds } } })
    : [];
  const personIds = [...new Set(people.map((row) => row.personId))];
  const title = (input.title || conversation.title || "From Ask").trim().slice(0, 200);
  const body = (input.body || lastAssistant.text).trim();
  const story = await createStoryRecord({
    familyId: input.familyId,
    title,
    body,
    personIds,
  });
  await keepAskCitations(input.familyId, story.id, sources);
  await prisma.askConversation.update({
    where: { id: conversation.id },
    data: { storyId: story.id },
  });
  const saved = await prisma.story.findFirst({
    where: { id: story.id },
    include: { citations: { include: { document: true, asset: true } }, people: { include: { person: true } } },
  });
  return { story: saved ?? story, heading: askStorySavedLine(title), reused: false };
}

export async function keepAskCitations(familyId: string, storyId: string, sources: AskSource[]) {
  if (!sources.length) return [];
  return prisma.citation.createMany({
    data: sources.map((source) => ({
      familyId,
      storyId,
      documentId: source.kind === "photo" ? null : source.documentId,
      assetId: source.kind === "photo" ? source.documentId : null,
      claim: (source.excerpt || source.title).trim().slice(0, 800),
      pageNote: source.title,
      kind: "ask",
      quality: "copy",
    })),
  });
}
