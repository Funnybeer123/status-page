import { NextResponse } from "next/server";
import { EventKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileWorksheet } from "@/lib/worksheets";
import { findOrCreatePlace } from "@/lib/places";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  kind: z.enum(["census", "birth", "death"]),
  personId: z.string(),
  year: z.string().optional(),
  place: z.string().optional(),
  detail: z.string().optional(),
  documentId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id, kind: { in: ["census", "birth", "death"] } },
    include: { person: true, document: true, event: true },
    orderBy: { claim: "asc" },
  });
  return NextResponse.json({ citations });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A worksheet needs a person and a kind." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const draft = compileWorksheet({
    kind: body.data.kind,
    personName: person.displayName,
    personId: person.id,
    year: body.data.year,
    place: body.data.place,
    detail: body.data.detail,
  });
  const place = draft.place
    ? await findOrCreatePlace({ familyId: ctx.family.id, name: draft.place })
    : null;
  const existingEvent = await prisma.lifeEvent.findFirst({
    where: { familyId: ctx.family.id, personId: person.id, kind: draft.kind as EventKind },
  });
  const event =
    existingEvent ??
    (await prisma.lifeEvent.create({
      data: {
        familyId: ctx.family.id,
        personId: person.id,
        kind: draft.kind as EventKind,
        title: draft.title,
        happenedOn: draft.happenedOn ? new Date(draft.happenedOn) : null,
        placeId: place?.id ?? null,
        summary: draft.pageNote,
      },
    }));
  const citation = await prisma.citation.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      eventId: event.id,
      documentId: body.data.documentId || null,
      kind: draft.kind,
      claim: draft.claim,
      pageNote: draft.pageNote,
    },
    include: { person: true, event: true, document: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "cited",
    entityType: "citation",
    entityId: citation.id,
    title: draft.title,
  });
  return NextResponse.json({ citation, event });
}
