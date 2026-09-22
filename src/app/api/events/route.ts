import { NextResponse } from "next/server";
import { DatePrecision, EventKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/parse";
import { findOrCreatePlace } from "@/lib/places";
import { hideEventFromViewer } from "@/lib/privacy";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  personId: z.string(),
  otherPersonId: z.string().optional(),
  kind: z.nativeEnum(EventKind),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  happenedOn: z.string().optional(),
  placeId: z.string().optional(),
  name: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  precision: z.nativeEnum(DatePrecision).optional(),
  rangeEnd: z.string().optional(),
  firstTag: z.enum(["house", "car", "child", "job", "school"]).optional().nullable(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const events = await prisma.lifeEvent.findMany({
    where: {
      familyId: ctx.family.id,
      ...(personId ? { OR: [{ personId }, { otherPersonId: personId }] } : {}),
    },
    include: { person: true, otherPerson: true, place: true, citations: true },
    orderBy: { happenedOn: "asc" },
  });
  return NextResponse.json({
    events: events.filter((event) => !hideEventFromViewer(ctx.role, event)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An event needs a person, kind, and title." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (body.data.otherPersonId) {
    const other = await prisma.person.findFirst({
      where: { id: body.data.otherPersonId, familyId: ctx.family.id },
    });
    if (!other) return NextResponse.json({ error: "The other person must be in this family." }, { status: 400 });
  }
  const place = await findOrCreatePlace({
    familyId: ctx.family.id,
    placeId: body.data.placeId,
    name: body.data.name,
    locality: body.data.locality,
    region: body.data.region,
    country: body.data.country,
  });
  const event = await prisma.lifeEvent.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      otherPersonId: body.data.otherPersonId || null,
      placeId: place?.id ?? null,
      kind: body.data.kind,
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() || null,
      happenedOn: parseDate(body.data.happenedOn),
      rangeEnd: parseDate(body.data.rangeEnd),
      precision: body.data.precision ?? DatePrecision.exact,
      firstTag: body.data.firstTag || null,
    },
    include: { person: true, otherPerson: true, place: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "event",
    entityId: event.id,
    title: event.title,
    summary: event.kind,
  });
  return NextResponse.json({ event });
}
