import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const optionalDate = z.string().optional();
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("probate"),
    personId: z.string(),
    title: z.string().min(1).max(160),
    happenedOn: optionalDate,
    place: z.string().max(160).optional(),
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("naturalization"),
    personId: z.string(),
    court: z.string().min(1).max(160),
    place: z.string().max(160).optional(),
    happenedOn: optionalDate,
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("address"),
    personId: z.string().optional(),
    label: z.string().min(1).max(80),
    line: z.string().min(1).max(200),
    locality: z.string().max(120).optional(),
    region: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
  }),
  z.object({
    kind: z.literal("apprenticeship"),
    personId: z.string(),
    trade: z.string().min(1).max(160),
    master: z.string().max(160).optional(),
    place: z.string().max(160).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
  }),
  z.object({
    kind: z.literal("mention"),
    personId: z.string(),
    headline: z.string().min(1).max(200),
    paper: z.string().max(160).optional(),
    publishedOn: optionalDate,
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("pet"),
    personId: z.string().optional(),
    name: z.string().min(1).max(80),
    petKind: z.string().min(1).max(80).optional(),
    startedOn: optionalDate,
    endedOn: optionalDate,
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("textile"),
    makerId: z.string().optional(),
    title: z.string().min(1).max(160),
    textileKind: z.string().min(1).max(80).optional(),
    madeOn: optionalDate,
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("dna"),
    personId: z.string(),
    haplogroup: z.string().max(80).optional(),
    company: z.string().max(80).optional(),
    notes: z.string().max(800).optional(),
  }),
  z.object({
    kind: z.literal("inscription"),
    personId: z.string(),
    text: z.string().min(1).max(400),
    place: z.string().max(160).optional(),
  }),
  z.object({
    kind: z.literal("holiday"),
    title: z.string().min(1).max(160),
    season: z.string().max(80).optional(),
    notes: z.string().max(800).optional(),
  }),
]);

async function belong(familyId: string, personId?: string | null) {
  if (!personId) return true;
  return Boolean(await prisma.person.findFirst({ where: { id: personId, familyId, deletedAt: null } }));
}

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const kind = new URL(req.url).searchParams.get("kind") || "";
  const familyId = ctx.family.id;
  if (kind === "probate") {
    return NextResponse.json({
      records: await prisma.probateRecord.findMany({ where: { familyId }, include: { person: true }, orderBy: { happenedOn: "asc" } }),
    });
  }
  if (kind === "naturalization") {
    return NextResponse.json({
      records: await prisma.naturalizationRecord.findMany({ where: { familyId }, include: { person: true }, orderBy: { happenedOn: "asc" } }),
    });
  }
  if (kind === "address") {
    return NextResponse.json({
      records: await prisma.familyAddress.findMany({ where: { familyId }, include: { person: true }, orderBy: { label: "asc" } }),
    });
  }
  if (kind === "apprenticeship") {
    return NextResponse.json({
      records: await prisma.apprenticeship.findMany({ where: { familyId }, include: { person: true }, orderBy: { startedOn: "asc" } }),
    });
  }
  if (kind === "mention") {
    return NextResponse.json({
      records: await prisma.newspaperMention.findMany({ where: { familyId }, include: { person: true }, orderBy: { publishedOn: "asc" } }),
    });
  }
  if (kind === "pet") {
    return NextResponse.json({
      records: await prisma.familyPet.findMany({ where: { familyId }, include: { person: true }, orderBy: { name: "asc" } }),
    });
  }
  if (kind === "textile") {
    return NextResponse.json({
      records: await prisma.textileRecord.findMany({ where: { familyId }, include: { maker: true }, orderBy: { title: "asc" } }),
    });
  }
  if (kind === "dna") {
    return NextResponse.json({
      records: await prisma.dnaNote.findMany({ where: { familyId }, include: { person: true }, orderBy: { haplogroup: "asc" } }),
    });
  }
  if (kind === "inscription") {
    return NextResponse.json({
      records: await prisma.gravestoneInscription.findMany({ where: { familyId }, include: { person: true }, orderBy: { place: "asc" } }),
    });
  }
  if (kind === "holiday") {
    return NextResponse.json({
      records: await prisma.familyHoliday.findMany({ where: { familyId }, orderBy: { title: "asc" } }),
    });
  }
  return NextResponse.json({ error: "Unknown record kind." }, { status: 400 });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "That later record is incomplete." }, { status: 400 });
  const familyId = ctx.family.id;
  const actorId = ctx.session.user.id;
  const data = body.data;
  if ("personId" in data && !(await belong(familyId, data.personId))) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  if (data.kind === "probate") {
    const record = await prisma.probateRecord.create({
      data: {
        familyId,
        personId: data.personId,
        title: data.title.trim(),
        happenedOn: data.happenedOn ? new Date(data.happenedOn) : null,
        place: data.place?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "probate", entityId: record.id, title: record.title });
    return NextResponse.json({ record });
  }
  if (data.kind === "naturalization") {
    const record = await prisma.naturalizationRecord.create({
      data: {
        familyId,
        personId: data.personId,
        court: data.court.trim(),
        place: data.place?.trim() || null,
        happenedOn: data.happenedOn ? new Date(data.happenedOn) : null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "naturalization", entityId: record.id, title: record.court });
    return NextResponse.json({ record });
  }
  if (data.kind === "address") {
    const record = await prisma.familyAddress.create({
      data: {
        familyId,
        personId: data.personId || null,
        label: data.label.trim(),
        line: data.line.trim(),
        locality: data.locality?.trim() || null,
        region: data.region?.trim() || null,
        country: data.country?.trim() || null,
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "address", entityId: record.id, title: record.label });
    return NextResponse.json({ record });
  }
  if (data.kind === "apprenticeship") {
    const record = await prisma.apprenticeship.create({
      data: {
        familyId,
        personId: data.personId,
        trade: data.trade.trim(),
        master: data.master?.trim() || null,
        place: data.place?.trim() || null,
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "apprenticeship", entityId: record.id, title: record.trade });
    return NextResponse.json({ record });
  }
  if (data.kind === "mention") {
    const record = await prisma.newspaperMention.create({
      data: {
        familyId,
        personId: data.personId,
        headline: data.headline.trim(),
        paper: data.paper?.trim() || null,
        publishedOn: data.publishedOn ? new Date(data.publishedOn) : null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "mention", entityId: record.id, title: record.headline });
    return NextResponse.json({ record });
  }
  if (data.kind === "pet") {
    const record = await prisma.familyPet.create({
      data: {
        familyId,
        personId: data.personId || null,
        name: data.name.trim(),
        kind: data.petKind?.trim() || "pet",
        startedOn: data.startedOn ? new Date(data.startedOn) : null,
        endedOn: data.endedOn ? new Date(data.endedOn) : null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "pet", entityId: record.id, title: record.name });
    return NextResponse.json({ record });
  }
  if (data.kind === "textile") {
    if (data.makerId && !(await belong(familyId, data.makerId))) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }
    const record = await prisma.textileRecord.create({
      data: {
        familyId,
        makerId: data.makerId || null,
        title: data.title.trim(),
        kind: data.textileKind?.trim() || "quilt",
        madeOn: data.madeOn ? new Date(data.madeOn) : null,
        notes: data.notes?.trim() || null,
      },
      include: { maker: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "textile", entityId: record.id, title: record.title });
    return NextResponse.json({ record });
  }
  if (data.kind === "dna") {
    const record = await prisma.dnaNote.create({
      data: {
        familyId,
        personId: data.personId,
        haplogroup: data.haplogroup?.trim() || null,
        company: data.company?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "dna", entityId: record.id, title: record.haplogroup || record.company || "DNA note" });
    return NextResponse.json({ record });
  }
  if (data.kind === "inscription") {
    const record = await prisma.gravestoneInscription.create({
      data: {
        familyId,
        personId: data.personId,
        text: data.text.trim(),
        place: data.place?.trim() || null,
      },
      include: { person: true },
    });
    await recordActivity({ familyId, actorId, verb: "recorded", entityType: "inscription", entityId: record.id, title: record.person.displayName });
    return NextResponse.json({ record });
  }
  const record = await prisma.familyHoliday.create({
    data: {
      familyId,
      title: data.title.trim(),
      season: data.season?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
  await recordActivity({ familyId, actorId, verb: "recorded", entityType: "holiday", entityId: record.id, title: record.title });
  return NextResponse.json({ record });
}
