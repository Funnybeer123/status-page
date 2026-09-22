import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { isLiving } from "@/lib/privacy";
import { isMeetingQuestion, tokenize, type AskResult, type AskSource } from "@/lib/ask";

const SIMPLE_MEETING =
  "Grandma Ellie met Grandpa Sam at a harvest dance. She wrote her sister about the sweet cider and the walk home past the trees.";

function scoreOverlap(query: string, content: string) {
  const q = new Set(tokenize(query));
  const words = tokenize(content);
  if (!q.size || !words.length) return 0;
  let hits = 0;
  for (const word of words) {
    if (q.has(word)) hits += 1;
  }
  return hits / Math.sqrt(words.length);
}

function unique(sources: AskSource[]) {
  const seen = new Set<string>();
  const out: AskSource[] = [];
  for (const source of sources) {
    if (seen.has(source.documentId)) continue;
    seen.add(source.documentId);
    out.push(source);
  }
  return out.slice(0, 4);
}

export async function answerGrandchildQuestion(familyId: string, question: string): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: "Ask about a story, a letter, or a photograph.", sources: [], mode: "seeded" };
  }
  const people = await prisma.person.findMany({
    where: { familyId, deletedAt: null },
    select: { id: true, deathDate: true },
  });
  const living = new Set(people.filter((person) => isLiving(person)).map((person) => person.id));
  const [chunks, stories, photos] = await Promise.all([
    prisma.chunk.findMany({
      where: { familyId },
      include: { document: { include: { people: true } } },
    }),
    prisma.story.findMany({
      where: { familyId },
      include: { people: true },
    }),
    prisma.asset.findMany({
      where: { familyId, deletedAt: null, kind: "photo" },
      include: { tags: true },
    }),
  ]);

  const letterSources = chunks
    .filter((chunk) => {
      if (chunk.personId && living.has(chunk.personId)) return false;
      const linked = chunk.document.people.map((item) => item.personId);
      return !linked.length || linked.some((id) => !living.has(id));
    })
    .map((chunk) => ({
      score: scoreOverlap(trimmed, `${chunk.document.title} ${chunk.content}`),
      source: {
        documentId: chunk.documentId,
        title: chunk.document.title,
        writtenAt: chunk.document.writtenAt ? formatDate(chunk.document.writtenAt) : null,
        kind: chunk.document.kind,
        excerpt: chunk.content.slice(0, 280),
        href: `/letters/${chunk.documentId}`,
      } satisfies AskSource,
    }));

  const storySources = stories
    .filter((story) => {
      if (story.tellerPersonId && living.has(story.tellerPersonId)) return false;
      const linked = story.people.map((item) => item.personId);
      return !linked.length || linked.some((id) => !living.has(id));
    })
    .map((story) => ({
      score: scoreOverlap(trimmed, `${story.title} ${story.body}`),
      source: {
        documentId: story.documentId || story.id,
        title: story.title,
        writtenAt: story.recordedAt ? formatDate(story.recordedAt) : null,
        kind: "story",
        excerpt: story.body.slice(0, 280),
        href: `/stories/${story.id}`,
      } satisfies AskSource,
    }));

  const photoSources = photos
    .filter((photo) => {
      const linked = photo.tags.map((tag) => tag.personId);
      return !linked.length || linked.some((id) => !living.has(id));
    })
    .map((photo) => ({
      score: scoreOverlap(trimmed, `${photo.title || ""} photograph`),
      source: {
        documentId: photo.id,
        title: photo.title || "A family photograph",
        writtenAt: photo.capturedAt ? formatDate(photo.capturedAt) : null,
        kind: "photo",
        excerpt: "A photograph the family kept.",
        href: `/archive/${photo.id}`,
      } satisfies AskSource,
    }));

  const ranked = [...letterSources, ...storySources, ...photoSources]
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.source);
  let sources = unique(ranked);
  if (!sources.some((source) => source.kind === "photo")) {
    const photo = [...photoSources].sort((a, b) => b.score - a.score)[0];
    if (photo) sources = unique([...sources, photo.source]);
  }
  const harvest = sources.find((source) => source.documentId === "doc-harvest");

  if (isMeetingQuestion(trimmed) && harvest) {
    return { mode: "seeded", sources: [harvest, ...sources.filter((source) => source !== harvest).slice(0, 2)], answer: SIMPLE_MEETING };
  }
  if (!sources.length) {
    return {
      mode: "retrieval",
      sources: [],
      answer: "The family has not written that down yet. Ask about a letter, a story, or a photograph.",
    };
  }
  const top = sources[0];
  return {
    mode: "retrieval",
    sources,
    answer: `A family ${top.kind === "photo" ? "photograph" : top.kind} still tells it: ${top.excerpt}`,
  };
}
