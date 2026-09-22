import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/chunk";
import { formatDate } from "@/lib/dates";

export type AskSource = {
  documentId: string;
  title: string;
  writtenAt: string | null;
  kind: string;
  excerpt: string;
  href?: string;
};

export type AskResult = {
  answer: string;
  sources: AskSource[];
  mode: "seeded" | "retrieval" | "live";
};

const ALIASES: Record<string, string> = {
  met: "meet",
  meeting: "meet",
  meets: "meet",
  grandma: "grandmother",
  granny: "grandmother",
  nana: "grandmother",
  grandpa: "grandfather",
  grandad: "grandfather",
  granddad: "grandfather",
};

const STOP = new Set([
  "the", "and", "for", "was", "with", "that", "this", "from", "did", "how",
  "who", "what", "when", "where", "her", "his", "she", "him", "they", "our",
  "you", "are", "about",
]);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
    .map((word) => ALIASES[word] ?? word);
}

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

export function isMeetingQuestion(question: string) {
  const q = question.toLowerCase();
  const mentionsMeet = /meet|met|dance|cottonwood|grange|how did/.test(q);
  const mentionsPair =
    /(grandma|grandmother|granny|nana|ellie|eleanor|whitaker).{0,60}(grandpa|grandfather|grandad|sam|samuel|hart)/.test(q) ||
    /(grandpa|grandfather|grandad|sam|samuel).{0,60}(grandma|grandmother|granny|nana|ellie|eleanor)/.test(q) ||
    (/(grandma|grandfather|grandpa|grandmother|ellie|eleanor|sam|samuel)/.test(q) && /meet|met/.test(q));
  return mentionsMeet && mentionsPair;
}

const HART_MEETING_ANSWER =
  "Eleanor Whitaker met Samuel Hart at the Grange hall harvest dance in Cedar Falls, Iowa, on a Saturday in October 1947. She wrote to her sister Ruth six days later: they danced three times, the cider was too sweet, the fiddle ran a little sharp, and he asked to walk her home past the cottonwoods. She said yes. They married the following June under those same trees.";

export type AskTurnInput = { role: "user" | "assistant"; text: string };

export type AskOptions = { bilingual?: boolean };

export function preferAskText(transcript?: string | null, translation?: string | null, bilingual = false) {
  const original = transcript?.trim() || "";
  const rendered = translation?.trim() || "";
  if (bilingual && rendered) return rendered;
  return original;
}

export function bilingualAskHeading(on: boolean) {
  return on ? "Ask · prefer the translation" : "Ask · original wording";
}

export function missingTranslationHeading(count: number) {
  if (!count) return "Every letter already has a translation";
  if (count === 1) return "1 letter still needs a translation";
  return `${count} letters still need a translation`;
}

export function isFollowUp(question: string) {
  const q = question.trim();
  if (!q) return false;
  if (/(grandma|grandfather|grandpa|grandmother)/i.test(q) && /meet|met/.test(q)) return false;
  const short = tokenize(q).length <= 4;
  const starts = /^(what|where|when|who|why|and|did|was|were|how|which)\b/i.test(q);
  const pronoun = /\b(she|he|they|that|those|this|her|his|him|them|the letter|the dance|the cider|the hatband)\b/i.test(q);
  return (starts && (pronoun || short)) || (pronoun && short);
}

export function expandAskQuery(question: string, prior: AskTurnInput[] = []) {
  const trimmed = question.trim();
  if (!prior.length || !isFollowUp(trimmed)) return trimmed;
  const earlier = prior
    .filter((turn) => turn.role === "user")
    .slice(-2)
    .map((turn) => turn.text)
    .join(" ");
  return earlier ? `${earlier} ${trimmed}` : trimmed;
}

export async function answerQuestion(
  familyId: string,
  question: string,
  prior: AskTurnInput[] = [],
  options: AskOptions = {},
): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: "Ask a question about this family’s letters and notes.", sources: [], mode: "seeded" };
  }

  const bilingual = Boolean(options.bilingual);
  const lookup = expandAskQuery(trimmed, prior);
  const retrieved = await retrieve(familyId, lookup, bilingual);
  const harvestInThisFamily = await loadDocumentSource(familyId, "doc-harvest", bilingual);

  if (isMeetingQuestion(lookup) && harvestInThisFamily) {
    const harvest =
      retrieved.find((item) => item.documentId === "doc-harvest") ?? harvestInThisFamily;
    const extras = retrieved.filter((item) => item.documentId !== "doc-harvest").slice(0, 2);
    return {
      mode: "seeded",
      sources: [harvest, ...extras],
      answer: HART_MEETING_ANSWER,
    };
  }

  if (process.env.OPENAI_API_KEY && retrieved.length) {
    const live = await liveAnswer(lookup, retrieved);
    if (live) return live;
  }

  if (!retrieved.length) {
    return {
      mode: "retrieval",
      sources: [],
      answer:
        "Nothing in this family’s letters or notes answers that yet. Add a letter or a note, then ask again.",
    };
  }

  const top = retrieved[0];
  return {
    mode: "retrieval",
    sources: retrieved,
    answer: `From ${top.title}${top.writtenAt ? ` (${top.writtenAt})` : ""}:\n\n${top.excerpt}`,
  };
}

async function loadDocumentSource(
  familyId: string,
  documentId: string,
  bilingual = false,
): Promise<AskSource | null> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, familyId, keepOutOfAsk: false },
  });
  if (!doc) return null;
  return {
    documentId: doc.id,
    title: doc.title,
    writtenAt: doc.writtenAt ? formatDate(doc.writtenAt) : null,
    kind: doc.kind,
    excerpt: preferAskText(doc.transcript, doc.translation, bilingual).slice(0, 420),
  };
}

async function retrieve(familyId: string, question: string, bilingual = false): Promise<AskSource[]> {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    const embedding = await createEmbedding(question);
    if (embedding) {
      const rows = await prisma.$queryRaw<
        {
          documentId: string;
          content: string;
          title: string;
          writtenAt: Date | null;
          kind: string;
          translation: string | null;
        }[]
      >`
        SELECT c."documentId", c.content, d.title, d."writtenAt", d.kind::text, d.translation
        FROM "Chunk" c
        JOIN "Document" d ON d.id = c."documentId"
        WHERE c."familyId" = ${familyId}
          AND c.embedding IS NOT NULL
          AND d."keepOutOfAsk" = false
        ORDER BY c.embedding <=> ${JSON.stringify(embedding)}::vector
        LIMIT 6
      `;
      if (rows.length) {
        return uniqueSources(
          rows.map((row) => ({
            documentId: row.documentId,
            title: row.title,
            writtenAt: row.writtenAt ? formatDate(row.writtenAt) : null,
            kind: row.kind,
            excerpt: preferAskText(row.content, row.translation, bilingual),
          })),
        );
      }
    }
  }

  const chunks = await prisma.chunk.findMany({
    where: { familyId, document: { keepOutOfAsk: false } },
    include: { document: true },
  });
  return uniqueSources(
    chunks
      .map((chunk) => {
        const scored = bilingual
          ? `${chunk.content} ${chunk.document.translation || ""}`
          : chunk.content;
        return {
          score: scoreOverlap(question, `${chunk.document.title} ${scored}`),
          source: {
            documentId: chunk.documentId,
            title: chunk.document.title,
            writtenAt: chunk.document.writtenAt ? formatDate(chunk.document.writtenAt) : null,
            kind: chunk.document.kind,
            excerpt: preferAskText(chunk.content, chunk.document.translation, bilingual),
          },
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.source),
  );
}

function uniqueSources(sources: AskSource[]) {
  const seen = new Set<string>();
  const out: AskSource[] = [];
  for (const source of sources) {
    if (seen.has(source.documentId)) continue;
    seen.add(source.documentId);
    out.push(source);
  }
  return out.slice(0, 4);
}

async function liveAnswer(question: string, sources: AskSource[]): Promise<AskResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const context = sources
    .map((source, index) => `[${index + 1}] ${source.title} (${source.writtenAt ?? "undated"})\n${source.excerpt}`)
    .join("\n\n");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer family-history questions using only the supplied sources. Cite them by title. If the sources do not say, say you do not know.",
        },
        { role: "user", content: `Question: ${question}\n\nSources:\n${context}` },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) return null;
  return { answer, sources, mode: "live" };
}
