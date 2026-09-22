import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const optionalDate = z.string().optional();

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("occupation"),
    personId: z.string(),
    title: z.string().min(1).max(160),
    employer: z.string().max(160).optional(),
    place: z.string().max(160).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
  }),
  z.object({
    kind: z.literal("godparent"),
    childId: z.string(),
    godparentId: z.string(),
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("congregation"),
    personId: z.string(),
    name: z.string().min(1).max(160),
    place: z.string().max(160).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
  }),
  z.object({
    kind: z.literal("land"),
    personId: z.string(),
    title: z.string().min(1).max(160),
    place: z.string().min(1).max(160),
    acquiredOn: optionalDate,
    notes: z.string().max(800).optional(),
    abstract: z.string().max(4000).optional(),
    homeId: z.string().optional(),
  }),
  z.object({
    kind: z.literal("military"),
    personId: z.string(),
    branch: z.string().min(1).max(160),
    unit: z.string().max(160).optional(),
    unitId: z.string().optional(),
    unitName: z.string().max(160).optional(),
    rank: z.string().max(80).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("bible"),
    title: z.string().min(1).max(160),
    holderId: z.string().optional(),
    body: z.string().min(1).max(8000),
    recordedAt: optionalDate,
  }),
  z.object({
    kind: z.literal("motto"),
    text: z.string().min(1).max(400),
    language: z.string().max(80).optional(),
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("passport"),
    personId: z.string(),
    numberNote: z.string().max(80).optional(),
    issuedOn: optionalDate,
    place: z.string().max(160).optional(),
    notes: z.string().max(800).optional(),
  }),
]);

async function belong(familyId: string, personId?: string | null) {
  if (!personId) return true;
  const person = await prisma.person.findFirst({ where: { id: personId, familyId, deletedAt: null } });
  return Boolean(person);
}

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const kind = new URL(req.url).searchParams.get("kind") || "";
  const familyId = ctx.family.id;
  if (kind === "occupation") {
    return NextResponse.json({
      records: await prisma.occupationRecord.findMany({ where: { familyId }, include: { person: true }, orderBy: { startedOn: "asc" } }),
    });
  }
  if (kind === "godparent") {
    return NextResponse.json({
      records: await prisma.godparent.findMany({
        where: { familyId },
        include: { child: true, godparent: true },
        orderBy: { childId: "asc" },
      }),
    });
  }
  if (kind === "congregation") {
    return NextResponse.json({
      records: await prisma.congregation.findMany({ where: { familyId }, include: { person: true }, orderBy: { name: "asc" } }),
    });
  }
  if (kind === "land") {
    return NextResponse.json({
      records: await prisma.landRecord.findMany({
        where: { familyId },
        include: { person: true, home: true },
        orderBy: { acquiredOn: "asc" },
      }),
    });
  }
  if (kind === "military") {
    return NextResponse.json({
      records: await prisma.militaryService.findMany({
        where: { familyId },
        include: { person: true, militaryUnit: true },
        orderBy: { startedOn: "asc" },
      }),
    });
  }
  if (kind === "bible") {
    return NextResponse.json({
      records: await prisma.bibleRecord.findMany({ where: { familyId }, include: { holder: true }, orderBy: { title: "asc" } }),
    });
  }
  if (kind === "motto") {
    return NextResponse.json({ records: await prisma.familyMotto.findMany({ where: { familyId } }) });
  }
  if (kind === "passport") {
    return NextResponse.json({
      records: await prisma.passportRecord.findMany({ where: { familyId }, include: { person: true }, orderBy: { issuedOn: "asc" } }),
    });
  }
  return NextResponse.json({ error: "Unknown record kind." }, { status: 400 });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "That family record is incomplete." }, { status: 400 });
  const familyId = ctx.family.id;
  const actorId = ctx.session.user.id;
  const data = body.data;

  if (data.kind === "occupation") {
    if (!(await belong(familyId, data.personId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const record = await prisma.occupationRecord.create({
      data: {
        familyId,
        personId: data.personId,
        title: data.title.trim(),
        employer: data.employer?.trim() || null,
        place: data.place?.trim() || null,
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "occupation", entityId: record.id, title: record.title });
    return NextResponse.json({ record });
  }
  if (data.kind === "godparent") {
    if (!(await belong(familyId, data.childId)) || !(await belong(familyId, data.godparentId))) {
      return NextResponse.json({ error: "Both people must belong to this family." }, { status: 404 });
    }
    const record = await prisma.godparent.create({
      data: {
        familyId,
        childId: data.childId,
        godparentId: data.godparentId,
        notes: data.notes?.trim() || null,
      },
      include: { child: true, godparent: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "godparent", entityId: record.id, title: "Godparent" });
    return NextResponse.json({ record });
  }
  if (data.kind === "congregation") {
    if (!(await belong(familyId, data.personId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const record = await prisma.congregation.create({
      data: {
        familyId,
        personId: data.personId,
        name: data.name.trim(),
        place: data.place?.trim() || null,
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "congregation", entityId: record.id, title: record.name });
    return NextResponse.json({ record });
  }
  if (data.kind === "land") {
    if (!(await belong(familyId, data.personId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const home = data.homeId
      ? await prisma.familyHome.findFirst({ where: { id: data.homeId, familyId } })
      : null;
    const record = await prisma.landRecord.create({
      data: {
        familyId,
        personId: data.personId,
        homeId: home?.id ?? null,
        title: data.title.trim(),
        place: data.place.trim(),
        acquiredOn: data.acquiredOn ? new Date(data.acquiredOn) : null,
        abstract: data.abstract?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true, home: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "land", entityId: record.id, title: record.title });
    return NextResponse.json({ record });
  }
  if (data.kind === "military") {
    if (!(await belong(familyId, data.personId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    let unitId = data.unitId || null;
    let unitName = data.unit?.trim() || null;
    if (data.unitName?.trim()) {
      const unit = await prisma.militaryUnit.create({
        data: {
          familyId,
          name: data.unitName.trim(),
          branch: data.branch.trim(),
        },
      });
      unitId = unit.id;
      unitName = unit.name;
    } else if (unitId) {
      const existing = await prisma.militaryUnit.findFirst({ where: { id: unitId, familyId } });
      if (existing) unitName = unitName || existing.name;
      else unitId = null;
    }
    const record = await prisma.militaryService.create({
      data: {
        familyId,
        personId: data.personId,
        unitId,
        branch: data.branch.trim(),
        unit: unitName,
        rank: data.rank?.trim() || null,
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true, militaryUnit: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "military", entityId: record.id, title: record.branch });
    return NextResponse.json({ record });
  }
  if (data.kind === "bible") {
    if (!(await belong(familyId, data.holderId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    const record = await prisma.bibleRecord.create({
      data: {
        familyId,
        title: data.title.trim(),
        holderId: data.holderId || null,
        body: data.body.trim(),
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : null,
      },
      include: { holder: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "bible", entityId: record.id, title: record.title });
    return NextResponse.json({ record });
  }
  if (data.kind === "motto") {
    const record = await prisma.familyMotto.create({
      data: {
        familyId,
        text: data.text.trim(),
        language: data.language?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "motto", entityId: record.id, title: record.text });
    return NextResponse.json({ record });
  }
  if (!(await belong(familyId, data.personId))) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const record = await prisma.passportRecord.create({
    data: {
      familyId,
      personId: data.personId,
      numberNote: data.numberNote?.trim() || null,
      issuedOn: data.issuedOn ? new Date(data.issuedOn) : null,
      place: data.place?.trim() || null,
      notes: data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({ familyId, actorId, verb: "recorded", entityType: "passport", entityId: record.id, title: "Passport" });
  return NextResponse.json({ record });
}
