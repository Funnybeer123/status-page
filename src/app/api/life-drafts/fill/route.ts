import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { answerQuestion } from "@/lib/ask";
import { compileLifeDraftFill, lifeDraftAskQuestion, lifeDraftHeading, mergeDraftBody } from "@/lib/lifeDraft";

const schema = z.object({
  personId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ask needs a person to write about." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const letters = person.documents
    .map((row) => row.document)
    .filter((doc) => doc.deletedAt == null && (doc.kind === DocKind.letter || doc.kind === DocKind.note))
    .map((doc) => ({ title: doc.title, excerpt: doc.transcript.slice(0, 280) }));
  const stories = [...person.storiesTold, ...person.storyLinks.map((link) => link.story)].map((story) => ({
    title: story.title,
    excerpt: story.body.slice(0, 280),
  }));
  const compiled = compileLifeDraftFill({ name: person.displayName, letters, stories });
  const asked = await answerQuestion(ctx.family.id, lifeDraftAskQuestion(person.displayName));
  const filled = mergeDraftBody(compiled.body, asked.answer);
  const existing = await prisma.lifeDraft.findUnique({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
  });
  const draft = await prisma.lifeDraft.upsert({
    where: { familyId_personId: { familyId: ctx.family.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      personId: person.id,
      title: compiled.title,
      body: filled,
    },
    update: {
      title: existing?.title || compiled.title,
      body: mergeDraftBody(existing?.body || "", filled),
    },
    include: { person: true },
  });
  return NextResponse.json({
    draft,
    heading: lifeDraftHeading(person.displayName),
    question: lifeDraftAskQuestion(person.displayName),
    ask: { answer: asked.answer, sources: asked.sources, mode: asked.mode },
  });
}
