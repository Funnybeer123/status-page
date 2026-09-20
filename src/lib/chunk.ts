import { prisma } from "@/lib/prisma";

export function splitChunks(text: string) {
  const parts = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

export async function replaceChunks(input: {
  familyId: string;
  documentId: string;
  personId?: string | null;
  transcript: string;
}) {
  await prisma.chunk.deleteMany({ where: { documentId: input.documentId } });
  const contents = splitChunks(input.transcript);
  if (!contents.length) return;
  await prisma.chunk.createMany({
    data: contents.map((content) => ({
      familyId: input.familyId,
      documentId: input.documentId,
      personId: input.personId ?? null,
      content,
    })),
  });

  if (process.env.OPENAI_API_KEY) {
    await embedDocument(input.documentId);
  }
}

async function embedDocument(documentId: string) {
  const chunks = await prisma.chunk.findMany({ where: { documentId } });
  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);
    if (!embedding) continue;
    await prisma.$executeRaw`
      UPDATE "Chunk"
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${chunk.id}
    `;
  }
}

export async function createEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const response = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: { embedding: number[] }[] };
  return payload.data?.[0]?.embedding ?? null;
}
