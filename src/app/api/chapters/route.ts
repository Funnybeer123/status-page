import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileLifeChapters, normalizeChapterKind } from "@/lib/chapters";

const schema = z.object({
  personId: z.string(),
  kind: z.string().optional(),
  title: z.string().min(1).max(160),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  if (!personId) return NextResponse.json({ error: "A person is required." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: personId, familyId: ctx.family.id, deletedAt: null },
    include: {
      lifeChapters: true,
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
      events: true,
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const stories = [
    ...person.storiesTold.map((story) => ({
      id: story.id,
      kind: "story" as const,
      title: story.title,
      happenedOn: story.recordedAt,
      href: `/stories/${story.id}`,
      body: story.body,
    })),
    ...person.storyLinks.map((link) => ({
      id: link.story.id,
      kind: "story" as const,
      title: link.story.title,
      happenedOn: link.story.recordedAt,
      href: `/stories/${link.story.id}`,
      body: link.story.body,
    })),
  ].filter((story, index, all) => all.findIndex((item) => item.id === story.id) === index);
  const letters = person.documents
    .filter((item) => item.document.kind !== "story" && !item.document.deletedAt)
    .map((item) => ({
      id: item.document.id,
      kind: "letter" as const,
      title: item.document.title,
      happenedOn: item.document.writtenAt,
      href: `/letters/${item.document.id}`,
      body: item.document.transcript,
    }));
  const photos = person.tags
    .filter((tag) => !tag.asset.deletedAt)
    .map((tag) => ({
      id: tag.asset.id,
      kind: "photo" as const,
      title: tag.asset.title || "Photograph",
      happenedOn: tag.asset.capturedAt,
      href: `/archive/${tag.asset.id}`,
    }));
  const events = person.events.map((event) => ({
    id: event.id,
    kind: "event" as const,
    title: event.title,
    happenedOn: event.happenedOn,
    href: `/people/${person.id}#event-${event.id}`,
  }));
  const chapters = compileLifeChapters({
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    named: person.lifeChapters,
    items: [...stories, ...letters, ...photos, ...events],
  });
  return NextResponse.json({ chapters });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A chapter needs a title." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const chapter = await prisma.lifeChapter.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      kind: normalizeChapterKind(body.data.kind),
      title: body.data.title.trim(),
      startedOn: body.data.startedOn ? new Date(body.data.startedOn) : null,
      endedOn: body.data.endedOn ? new Date(body.data.endedOn) : null,
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "chapter",
    entityId: person.id,
    title: chapter.title,
  });
  return NextResponse.json({ chapter });
}
